import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import * as puppeteer from 'puppeteer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { createWorker } from 'tesseract.js';
import { v2 } from '@google-cloud/translate';
import { PrismaService } from '../../config/prisma.service';
import { PlacesService } from '../places/places.service';
import { MENU_CACHE_TTL_HOURS } from '@helpmytravel/shared';

export const MENU_QUEUE = 'menu-discovery';

export interface MenuDiscoveryJobData {
  placeId: string;
  language: string;
}

interface RawMenuItem {
  name: string;
  description: string | null;
  price: string | null;
  category: string | null;
}

@Processor(MENU_QUEUE)
export class MenuDiscoveryProcessor {
  private readonly logger = new Logger(MenuDiscoveryProcessor.name);
  private readonly translateClient: v2.Translate;

  constructor(
    private prisma: PrismaService,
    private placesService: PlacesService,
  ) {
    this.translateClient = new v2.Translate({
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
  }

  @Process('discover')
  async handleDiscovery(job: Job<MenuDiscoveryJobData>) {
    const { placeId, language } = job.data;
    this.logger.log(`[Job ${job.id}] Starting menu discovery for ${placeId} in ${language}`);

    try {
      // Step 1: Get restaurant details (website, name, address)
      const place = await this.placesService.getPlaceDetails(placeId, language);
      await job.progress(10);

      let rawText: string | null = null;
      let source: 'WEBSITE' | 'GOOGLE' | 'OTHER' = 'WEBSITE';
      let sourceUrl: string | null = null;

      // Step 2: Try restaurant's own website
      if (place.website) {
        this.logger.log(`[Job ${job.id}] Trying website: ${place.website}`);
        const result = await this.scrapeWebsite(place.website);
        if (result) {
          rawText = result.text;
          sourceUrl = result.url;
          source = 'WEBSITE';
        }
      }
      await job.progress(35);

      // Step 3: Try Google Search if no menu found
      if (!rawText) {
        this.logger.log(`[Job ${job.id}] Trying Google Search`);
        const searchQuery = `"${place.name}" "${this.extractCity(place.address || '')}" menu cardápio`;
        const result = await this.searchAndScrape(searchQuery);
        if (result) {
          rawText = result.text;
          sourceUrl = result.url;
          source = 'GOOGLE';
        }
      }
      await job.progress(60);

      // Step 4: Try TripAdvisor/Yelp
      if (!rawText) {
        this.logger.log(`[Job ${job.id}] Trying aggregator sites`);
        const result = await this.scrapeAggregator(place.name!, place.address || '');
        if (result) {
          rawText = result.text;
          sourceUrl = result.url;
          source = 'OTHER';
        }
      }
      await job.progress(75);

      if (!rawText) {
        rawText = `Menu not available for ${place.name}. Please check the restaurant directly.`;
      }

      // Step 5: Parse raw text into MenuItem[]
      const items = this.parseMenuItems(rawText);

      // Step 6: Detect source language and translate
      const translatedItems = await this.translateItems(items, language);
      await job.progress(90);

      // Step 7: Persist in DB
      const expiresAt = new Date(Date.now() + MENU_CACHE_TTL_HOURS * 60 * 60 * 1000);
      await this.prisma.menuCache.upsert({
        where: { placeId_language: { placeId, language } },
        create: {
          placeId,
          language,
          rawText,
          items: translatedItems as any,
          source,
          sourceUrl,
          expiresAt,
        },
        update: {
          rawText,
          items: translatedItems as any,
          source,
          sourceUrl,
          expiresAt,
          fetchedAt: new Date(),
        },
      });

      await job.progress(100);
      this.logger.log(`[Job ${job.id}] Menu discovery completed for ${placeId}`);

      return { success: true, itemCount: translatedItems.length, source };
    } catch (err) {
      this.logger.error(`[Job ${job.id}] Menu discovery failed`, err);
      throw err;
    }
  }

  private async scrapeWebsite(
    url: string,
  ): Promise<{ text: string; url: string } | null> {
    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (compatible; HelpMyTravel/1.0; +https://helpmytravel.com)',
      );
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

      // Look for menu links
      const menuLinks = await page.$$eval('a', (links) =>
        links
          .filter((a) =>
            /menu|cardápio|cardapio|speisekarte|carte|menú/i.test(
              a.href + a.textContent,
            ),
          )
          .map((a) => a.href)
          .filter((href) => href.startsWith('http'))
          .slice(0, 3),
      );

      // Try menu sub-pages first
      for (const menuUrl of menuLinks) {
        const result = await this.extractFromPage(page, menuUrl);
        if (result && result.length > 100) return { text: result, url: menuUrl };
      }

      // Fallback: extract from current page
      const text = await this.extractFromPage(page, url);
      if (text && text.length > 100) return { text, url };

      return null;
    } catch (err) {
      this.logger.warn(`Failed to scrape ${url}: ${err}`);
      return null;
    } finally {
      await browser?.close();
    }
  }

  private async extractFromPage(page: puppeteer.Page, url: string): Promise<string | null> {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 });

      // Check if it's a PDF
      const contentType = await page.evaluate(() => document.contentType);
      if (contentType?.includes('pdf')) {
        const pdfBuffer = await page.pdf();
        return this.extractTextFromPdf(Buffer.from(pdfBuffer));
      }

      // Check for menu images
      const images = await page.$$eval('img', (imgs) =>
        imgs
          .filter((img) => /menu|cardápio|food/i.test(img.src + (img.alt || '')))
          .map((img) => img.src)
          .slice(0, 2),
      );

      for (const imgSrc of images) {
        const ocrText = await this.ocrImage(imgSrc);
        if (ocrText && ocrText.length > 50) return ocrText;
      }

      // Extract visible text
      const text = await page.evaluate(() => {
        const selectors = [
          '[class*="menu"]', '[id*="menu"]',
          '[class*="cardapio"]', '[class*="food"]',
          'main', 'article', '.content',
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim().length > 100) {
            return el.textContent.trim();
          }
        }
        return document.body.textContent?.trim() || '';
      });

      return text || null;
    } catch {
      return null;
    }
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return data.text;
    } catch {
      return '';
    }
  }

  private async ocrImage(imageUrl: string): Promise<string> {
    try {
      const worker = await createWorker('eng+por+spa+fra+deu+ita');
      const { data: { text } } = await worker.recognize(imageUrl);
      await worker.terminate();
      return text;
    } catch {
      return '';
    }
  }

  private async searchAndScrape(query: string): Promise<{ text: string; url: string } | null> {
    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)');
      await page.goto(
        `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`,
        { waitUntil: 'domcontentloaded', timeout: 10000 },
      );

      const links = await page.$$eval('a[href]', (anchors) =>
        anchors
          .map((a) => (a as HTMLAnchorElement).href)
          .filter(
            (href) =>
              href.startsWith('http') &&
              !href.includes('google.com') &&
              !href.includes('youtube.com'),
          )
          .slice(0, 5),
      );

      for (const link of links) {
        const result = await this.scrapeWebsite(link);
        if (result) return result;
      }

      return null;
    } catch (err) {
      this.logger.warn(`Google Search scraping failed: ${err}`);
      return null;
    } finally {
      await browser?.close();
    }
  }

  private async scrapeAggregator(
    placeName: string,
    address: string,
  ): Promise<{ text: string; url: string } | null> {
    const city = this.extractCity(address);
    const query = `site:tripadvisor.com OR site:yelp.com "${placeName}" "${city}" menu`;
    return this.searchAndScrape(query);
  }

  private parseMenuItems(rawText: string): RawMenuItem[] {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 2 && l.length < 200);

    const items: RawMenuItem[] = [];
    const pricePattern = /(\$|€|£|R\$|¥|₹|CHF|AED)?\s*\d+([.,]\d{1,2})?/;
    let currentCategory: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasPrice = pricePattern.test(line);
      const isShort = line.length < 50;
      const isAllCaps = line === line.toUpperCase() && line.length > 3;

      // Detect category headers (all caps, short, no price)
      if (isAllCaps && isShort && !hasPrice) {
        currentCategory = line;
        continue;
      }

      // Detect menu items (line with price, or short descriptive line)
      if (hasPrice || (isShort && i + 1 < lines.length && !pricePattern.test(lines[i + 1]))) {
        const priceMatch = line.match(pricePattern);
        const price = priceMatch ? priceMatch[0].trim() : null;
        const name = line.replace(pricePattern, '').replace(/[.\-_]+$/, '').trim();

        if (name.length > 2) {
          const description = hasPrice && i + 1 < lines.length && !pricePattern.test(lines[i + 1])
            ? lines[i + 1]
            : null;

          items.push({ name, description, price, category: currentCategory });
          if (description) i++; // Skip the description line
        }
      }
    }

    return items.slice(0, 150); // Cap at 150 items
  }

  private async translateItems(items: RawMenuItem[], targetLanguage: string): Promise<any[]> {
    if (items.length === 0) return [];

    // Batch translate all text at once for efficiency
    const textsToTranslate = items.flatMap((item) =>
      [item.name, item.description, item.category].filter(Boolean),
    ) as string[];

    if (textsToTranslate.length === 0) return items;

    try {
      const [translations] = await this.translateClient.translate(textsToTranslate, targetLanguage);
      const translationMap = new Map<string, string>();
      textsToTranslate.forEach((text, idx) => {
        translationMap.set(text, Array.isArray(translations) ? translations[idx] : translations);
      });

      return items.map((item, idx) => ({
        id: `item-${idx}`,
        name: translationMap.get(item.name) || item.name,
        nameOriginal: item.name,
        description: item.description ? (translationMap.get(item.description) || item.description) : null,
        descriptionOriginal: item.description,
        ingredients: null,
        price: item.price,
        priceValue: item.price ? parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || null : null,
        currency: item.price ? this.detectCurrency(item.price) : null,
        category: item.category ? (translationMap.get(item.category) || item.category) : null,
        imageUrl: null,
      }));
    } catch (err) {
      this.logger.warn('Translation failed, returning original items', err);
      return items.map((item, idx) => ({
        id: `item-${idx}`,
        name: item.name,
        nameOriginal: item.name,
        description: item.description,
        descriptionOriginal: item.description,
        ingredients: null,
        price: item.price,
        priceValue: null,
        currency: null,
        category: item.category,
        imageUrl: null,
      }));
    }
  }

  private extractCity(address: string): string {
    const parts = address.split(',');
    return parts[parts.length > 2 ? parts.length - 2 : 0]?.trim() || '';
  }

  private detectCurrency(price: string): string {
    if (price.includes('€')) return 'EUR';
    if (price.includes('$')) return 'USD';
    if (price.includes('£')) return 'GBP';
    if (price.includes('R$')) return 'BRL';
    if (price.includes('¥')) return 'JPY';
    return '';
  }
}
