import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import axios from 'axios';
import * as cheerio from 'cheerio';
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
  imageUrl: string | null;
}

const HTTP_TIMEOUT = 8000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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
    this.logger.log(`[Job ${job.id}] Starting menu discovery for ${placeId} → ${language}`);

    try {
      // Step 1: Get restaurant details from Google Places
      const place = await this.placesService.getPlaceDetails(placeId, language);
      await job.progress(10);

      const placeName = place.name || 'Unknown';
      const city = this.extractCity(place.address || '');
      this.logger.log(`[Job ${job.id}] Restaurant: "${placeName}" in ${city} — website: ${place.website || 'none'}`);

      let rawText: string | null = null;
      let source: 'WEBSITE' | 'GOOGLE' | 'OTHER' = 'WEBSITE';
      let sourceUrl: string | null = null;
      let foodImages: string[] = [];

      // Step 2: Try restaurant's website first (best chance of PDF with prices)
      // and carta.menu in parallel for speed
      this.logger.log(`[Job ${job.id}] Step 2: Trying website + carta.menu in parallel`);
      const [webResult, cartaResult] = await Promise.allSettled([
        place.website ? this.fetchWebsite(place.website) : Promise.resolve(null),
        this.tryCartaMenu(placeName, city),
      ]);
      await job.progress(35);

      // Prefer website (usually has PDF with prices)
      const webData = webResult.status === 'fulfilled' ? webResult.value : null;
      const cartaData = cartaResult.status === 'fulfilled' ? cartaResult.value : null;

      if (webData) {
        rawText = webData.text;
        sourceUrl = webData.url;
        source = 'WEBSITE';
        foodImages = webData.images || [];
        this.logger.log(`[Job ${job.id}] Found menu on website (${rawText.length} chars, ${foodImages.length} images)`);
      } else if (cartaData) {
        rawText = cartaData.text;
        sourceUrl = cartaData.url;
        source = 'OTHER';
        foodImages = cartaData.images || [];
        this.logger.log(`[Job ${job.id}] Found menu on carta.menu (${rawText.length} chars)`);
      }

      // Step 3: Try aggregator sites if needed
      if (!rawText) {
        this.logger.log(`[Job ${job.id}] Step 3: Trying aggregator sites`);
        const aggResult = await this.tryAggregators(placeName, city);
        if (aggResult) {
          rawText = aggResult.text;
          sourceUrl = aggResult.url;
          source = 'OTHER';
          foodImages = aggResult.images || [];
        }
      }
      await job.progress(55);

      // Step 4: Try Google Custom Search (if configured)
      if (!rawText) {
        const cseKey = process.env.GOOGLE_CSE_API_KEY;
        const cseId = process.env.GOOGLE_CSE_ID;
        if (cseKey && cseId) {
          this.logger.log(`[Job ${job.id}] Step 4: Trying Google Custom Search`);
          const cseResult = await this.googleCustomSearch(placeName, city, cseKey, cseId);
          if (cseResult) {
            rawText = cseResult.text;
            sourceUrl = cseResult.url;
            source = 'GOOGLE';
          }
        }
      }
      await job.progress(65);

      if (!rawText) {
        this.logger.warn(`[Job ${job.id}] No menu found for "${placeName}"`);
        throw new Error(`No menu found online for "${placeName}".`);
      }

      // Step 5: Parse raw text into menu items
      const items = this.parseMenuItems(rawText);
      this.logger.log(`[Job ${job.id}] Parsed ${items.length} menu items from ${source}`);

      if (items.length === 0) {
        throw new Error(`Could not extract menu items for "${placeName}". The menu format was not recognized.`);
      }

      // Step 6: Assign food images to items (round-robin if fewer images than items)
      if (foodImages.length > 0) {
        for (let i = 0; i < items.length; i++) {
          if (i < foodImages.length) {
            items[i].imageUrl = foodImages[i];
          }
        }
        this.logger.log(`[Job ${job.id}] Assigned ${Math.min(foodImages.length, items.length)} images to items`);
      }

      // Also try to get Google Places photos for the restaurant
      if (place.photos && place.photos.length > 0 && foodImages.length === 0) {
        const placesApiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (placesApiKey) {
          for (let i = 0; i < Math.min(items.length, place.photos.length); i++) {
            items[i].imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[i].photoReference}&key=${placesApiKey}`;
          }
          this.logger.log(`[Job ${job.id}] Added ${Math.min(items.length, place.photos.length)} Google Places photos`);
        }
      }

      // Step 7: Translate items
      const translatedItems = await this.translateItems(items, language);
      await job.progress(90);

      // Step 8: Persist in DB cache
      const expiresAt = new Date(Date.now() + MENU_CACHE_TTL_HOURS * 60 * 60 * 1000);
      await this.prisma.menuCache.upsert({
        where: { placeId_language: { placeId, language } },
        create: { placeId, language, rawText, items: translatedItems as any, source, sourceUrl, expiresAt },
        update: { rawText, items: translatedItems as any, source, sourceUrl, expiresAt, fetchedAt: new Date() },
      });

      await job.progress(100);
      this.logger.log(`[Job ${job.id}] Done — ${translatedItems.length} items from ${source}`);
      return { success: true, itemCount: translatedItems.length, source };
    } catch (err) {
      this.logger.error(`[Job ${job.id}] Failed: ${err}`);
      throw err;
    }
  }

  // ──────────────────────────────────────────────
  // Source 1: carta.menu (European menu database)
  // ──────────────────────────────────────────────
  private async tryCartaMenu(name: string, city: string): Promise<{ text: string; url: string; images: string[] } | null> {
    try {
      const citySlug = this.slugify(city);
      const nameSlug = this.slugify(name);
      const url = `https://carta.menu/restaurants/${citySlug}/${nameSlug}`;

      this.logger.log(`Trying carta.menu: ${url}`);
      const html = await this.httpGet(url);
      if (!html) return null;

      const $ = cheerio.load(html);

      // Extract food images before removing elements
      const images = this.extractFoodImages($, url);

      $('script, style, nav, footer, header, noscript').remove();
      const bodyText = this.cleanHtmlText($);

      if (bodyText && bodyText.length > 100) {
        return { text: bodyText, url, images };
      }

      return null;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Source 2: Restaurant's own website
  // ──────────────────────────────────────────────
  private async fetchWebsite(url: string): Promise<{ text: string; url: string; images: string[] } | null> {
    try {
      const html = await this.httpGet(url);
      if (!html) return null;

      const $ = cheerio.load(html);

      // First, look for links to menu sub-pages (including PDFs)
      const menuLinks = this.findMenuLinks($, url);
      this.logger.log(`Found ${menuLinks.length} menu links on ${url}`);

      $('script, style, nav, footer, header, noscript, iframe, svg').remove();

      // Try PDF links first (they usually have the best menu data with prices)
      for (const menuUrl of menuLinks) {
        if (menuUrl.toLowerCase().endsWith('.pdf')) {
          const pdfResult = await this.fetchPdf(menuUrl);
          if (pdfResult) return { ...pdfResult, images: [] }; // PDFs don't have extractable images
        }
      }

      // Try HTML menu sub-pages
      for (const menuUrl of menuLinks) {
        if (menuUrl.toLowerCase().endsWith('.pdf')) continue;
        const subHtml = await this.httpGet(menuUrl);
        if (!subHtml) continue;

        const $sub = cheerio.load(subHtml);
        const images = this.extractFoodImages($sub, menuUrl);
        $sub('script, style, nav, footer, header, noscript, iframe, svg').remove();
        const text = this.cleanHtmlText($sub);

        if (text && text.length > 80 && this.looksLikeMenu(text)) {
          return { text, url: menuUrl, images };
        }
      }

      // Try current page
      const images = this.extractFoodImages($, url);
      const text = this.cleanHtmlText($);
      if (text && text.length > 80 && this.looksLikeMenu(text)) {
        return { text, url, images };
      }

      return null;
    } catch (err) {
      this.logger.warn(`fetchWebsite failed for ${url}: ${err}`);
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // PDF download + text extraction
  // ──────────────────────────────────────────────
  private async fetchPdf(url: string): Promise<{ text: string; url: string } | null> {
    try {
      this.logger.log(`Downloading PDF: ${url}`);
      const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: HTTP_TIMEOUT,
        headers: { 'User-Agent': USER_AGENT },
        maxContentLength: 10 * 1024 * 1024, // 10MB max for PDFs
      });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(Buffer.from(res.data));

      if (data.text && data.text.length > 50) {
        this.logger.log(`PDF extracted: ${data.numpages} pages, ${data.text.length} chars`);
        return { text: data.text, url };
      }
      return null;
    } catch (err) {
      this.logger.warn(`PDF parse failed for ${url}: ${err}`);
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Source 3: Aggregator sites
  // ──────────────────────────────────────────────
  private async tryAggregators(name: string, city: string): Promise<{ text: string; url: string; images: string[] } | null> {
    const encodedQuery = encodeURIComponent(`${name} ${city}`);

    const urls = [
      `https://www.tripadvisor.com/Search?q=${encodedQuery}&searchSessionId=menu`,
      `https://restaurantguru.com/search?q=${encodedQuery}`,
      `https://www.thefork.com/search?queryText=${encodedQuery}`,
    ];

    for (const searchUrl of urls) {
      try {
        const html = await this.httpGet(searchUrl);
        if (!html) continue;

        const $ = cheerio.load(html);
        const images = this.extractFoodImages($, searchUrl);
        $('script, style, nav, footer, header, noscript').remove();

        const text = this.cleanHtmlText($);
        if (text && text.length > 100 && this.looksLikeMenu(text)) {
          return { text, url: searchUrl, images };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  // ──────────────────────────────────────────────
  // Source 4: Google Custom Search API
  // ──────────────────────────────────────────────
  private async googleCustomSearch(
    name: string, city: string, apiKey: string, cseId: string,
  ): Promise<{ text: string; url: string } | null> {
    try {
      const query = `${name} ${city} menu carta cardápio`;
      const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: { key: apiKey, cx: cseId, q: query, num: 5 },
        timeout: HTTP_TIMEOUT,
      });

      for (const item of (res.data.items || [])) {
        const url: string = item.link;
        if (/youtube|facebook|instagram/i.test(url)) continue;

        const result = await this.fetchWebsite(url);
        if (result) return result;
      }
    } catch (err) {
      this.logger.warn(`Google CSE failed: ${err}`);
    }
    return null;
  }

  // ──────────────────────────────────────────────
  // HTTP helper
  // ──────────────────────────────────────────────
  private async httpGet(url: string): Promise<string | null> {
    try {
      const res = await axios.get(url, {
        timeout: HTTP_TIMEOUT,
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'en,es,pt,fr,it,de;q=0.5',
        },
        maxRedirects: 5,
        responseType: 'text',
        maxContentLength: 5 * 1024 * 1024,
        validateStatus: (s) => s >= 200 && s < 400,
      });

      const ct = res.headers['content-type'] || '';
      if (!ct.includes('html') && !ct.includes('text')) return null;

      return typeof res.data === 'string' ? res.data : null;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Extract food images from HTML
  // ──────────────────────────────────────────────
  private extractFoodImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    const seen = new Set<string>();

    // Look for images in menu areas, or any food-related images
    const foodImgPattern = /menu|dish|food|plat|piatt|comida|carta|meal|cucina|gastrono|receta/i;
    const skipPattern = /logo|icon|avatar|banner|sprite|social|facebook|twitter|instagram|pixel|tracking|ad-|ads-|flag|arrow|btn|button/i;

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src') || '';
      const alt = $(el).attr('alt') || '';
      const cls = $(el).attr('class') || '';
      const width = parseInt($(el).attr('width') || '0', 10);
      const height = parseInt($(el).attr('height') || '0', 10);

      // Skip tiny images (icons, spacers)
      if ((width > 0 && width < 80) || (height > 0 && height < 80)) return;
      // Skip non-food images
      if (skipPattern.test(src) || skipPattern.test(cls)) return;

      // Prefer images that look food-related
      const isFoodRelated = foodImgPattern.test(src) || foodImgPattern.test(alt) || foodImgPattern.test(cls);
      // Also accept larger images (likely food photos)
      const isLarge = (width >= 200 || height >= 200) || (!width && !height);

      if (isFoodRelated || isLarge) {
        try {
          const fullUrl = new URL(src, baseUrl).toString();
          if (!seen.has(fullUrl) && fullUrl.startsWith('http')) {
            seen.add(fullUrl);
            images.push(fullUrl);
          }
        } catch { /* invalid URL */ }
      }
    });

    return images.slice(0, 30); // Cap at 30 images
  }

  // ──────────────────────────────────────────────
  // HTML → Clean text
  // ──────────────────────────────────────────────
  private cleanHtmlText($: cheerio.CheerioAPI): string {
    // Try menu-specific containers first
    const menuSelectors = [
      '[class*="menu"]', '[id*="menu"]',
      '[class*="carta"]', '[id*="carta"]',
      '[class*="cardapio"]', '[id*="cardapio"]',
      '[class*="dish"]', '[class*="food-list"]',
      '[class*="plat"]', '[class*="speisekarte"]',
    ];

    for (const sel of menuSelectors) {
      const els = $(sel);
      if (els.length > 0) {
        const combined = els.map((_, el) => $(el).text()).get().join('\n');
        const cleaned = this.cleanRawText(combined);
        if (cleaned.length > 80) return cleaned;
      }
    }

    // Try main content
    for (const sel of ['main', 'article', '.content', '#content', '.page-content', '.entry-content']) {
      const el = $(sel);
      if (el.length > 0) {
        const cleaned = this.cleanRawText(el.text());
        if (cleaned.length > 80) return cleaned;
      }
    }

    // Fallback: body
    return this.cleanRawText($('body').text());
  }

  private cleanRawText(raw: string): string {
    return raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && l.length < 300)
      .filter(l => !this.isNoiseLine(l))
      .join('\n');
  }

  // ──────────────────────────────────────────────
  // Find menu links on a page
  // ──────────────────────────────────────────────
  private findMenuLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    const menuPattern = /menu|card[aá]pio|carta|speisekarte|men[uú]|platos|dishes/i;

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text() || '';
      if (menuPattern.test(href) || menuPattern.test(text)) {
        try {
          const fullUrl = new URL(href, baseUrl).toString();
          if (fullUrl.startsWith('http') && !links.includes(fullUrl) && fullUrl !== baseUrl) {
            links.push(fullUrl);
          }
        } catch { /* invalid URL */ }
      }
    });

    // Also check for PDF links (many restaurants have PDF menus)
    $('a[href$=".pdf"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        if (!links.includes(fullUrl)) links.push(fullUrl);
      } catch { /* invalid URL */ }
    });

    return links.slice(0, 5);
  }

  // ──────────────────────────────────────────────
  // Heuristic: does this text look like a menu?
  // ──────────────────────────────────────────────
  private looksLikeMenu(text: string): boolean {
    const lower = text.toLowerCase();

    // Check for price patterns
    const pricePattern = /(\$|€|£|R\$|¥|₹|CHF)\s*\d{1,3}([.,]\d{1,2})?|\d{1,3}([.,]\d{1,2})?\s*(€|£|\$)/g;
    const priceMatches = lower.match(pricePattern);
    if (priceMatches && priceMatches.length >= 2) return true;

    // Check for menu keywords (multilingual)
    const keywords = [
      'appetizer', 'entrée', 'main course', 'dessert', 'beverage', 'starter',
      'antipasti', 'primi', 'secondi', 'dolci', 'contorni', 'insalata',
      'entrada', 'prato principal', 'sobremesa', 'bebida', 'aperitivo',
      'entrante', 'plato principal', 'postre', 'primer plato', 'segundo plato',
      'vorspeise', 'hauptgericht', 'nachspeise', 'beilage',
      'paella', 'pizza', 'pasta', 'hamburguesa', 'ensalada', 'sopa',
      'menu', 'cardápio', 'carta', 'preço', 'precio', 'price', 'prix',
      'per començar', 'de la mar', 'de la terra',
    ];
    const keywordCount = keywords.filter(kw => lower.includes(kw)).length;
    return keywordCount >= 2;
  }

  // ──────────────────────────────────────────────
  // Parse menu items from text
  // ──────────────────────────────────────────────
  parseMenuItems(rawText: string): RawMenuItem[] {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0 && l.length < 200);

    const pricePattern = /^(\d+([.,]\d{1,2})?\s*(€|£|\$|R\$|CHF)|(€|£|\$|R\$|CHF)\s*\d+([.,]\d{1,2})?)$/;
    const priceInline = /(\$|€|£|R\$|¥|₹|CHF|AED)\s*\d+([.,]\d{1,2})?|\d+([.,]\d{1,2})?\s*(€|£|\$|R\$|CHF)/;

    // Detect PDF-style format: prices listed separately from names
    // (block of prices at top of page, then block of names)
    const pdfItems = this.parsePdfSeparatedFormat(lines, pricePattern);
    if (pdfItems.length > 3) {
      this.logger.log(`Parsed ${pdfItems.length} items using PDF separated format`);
      return pdfItems.slice(0, 150);
    }

    // Standard format: price on same line as item name
    const items: RawMenuItem[] = [];
    let currentCategory: string | null = null;
    const cleanLines = lines.filter(l => l.length > 2);

    for (let i = 0; i < cleanLines.length; i++) {
      const line = cleanLines[i];
      if (this.isNoiseLine(line)) continue;

      const hasPrice = priceInline.test(line);
      const isShort = line.length < 50;
      const isAllCaps = line === line.toUpperCase() && line.length > 3 && line.length < 40;

      // Category headers
      if (isAllCaps && isShort && !hasPrice) {
        currentCategory = this.titleCase(line);
        continue;
      }

      // Menu items with price on same line
      if (hasPrice) {
        const priceMatch = line.match(priceInline);
        const price = priceMatch ? priceMatch[0].trim() : null;
        const name = line
          .replace(priceInline, '')
          .replace(/[.\-_…·•|]+$/, '')
          .replace(/^[.\-_…·•|]+/, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        if (name.length > 2 && name.length < 120) {
          let description: string | null = null;
          if (i + 1 < cleanLines.length) {
            const next = cleanLines[i + 1];
            if (!priceInline.test(next) && !this.isNoiseLine(next) && next.length > 5 && next.length < 150) {
              description = next;
              i++;
            }
          }
          items.push({ name, description, price, category: currentCategory, imageUrl: null });
        }
      }
    }

    if (items.length > 0) return items.slice(0, 150);

    // Fallback: no prices found, try keyword-based extraction
    return this.parseMenuWithoutPrices(cleanLines);
  }

  // Parse PDF format where prices appear in a separate block from names
  // E.g.: "1.20 €\n2.00 €\n...\nCATEGORY\nDISH NAME\nDISH NAME\n..."
  private parsePdfSeparatedFormat(lines: string[], pricePattern: RegExp): RawMenuItem[] {
    // Collect all price-only lines and name lines per page
    const pages: Array<{ prices: string[]; names: string[]; categories: Map<number, string> }> = [];
    let currentPrices: string[] = [];
    let currentNames: string[] = [];
    let currentCategories = new Map<number, string>();
    let inPriceBlock = false;
    let nameIndex = 0;

    const pageMarker = /^\d+\s*\/\s*\d+$/; // "1 / 3" style page markers

    for (const line of lines) {
      if (!line || line.length < 2) continue;
      if (pageMarker.test(line)) {
        // New page: save current and reset
        if (currentPrices.length > 0 || currentNames.length > 0) {
          pages.push({ prices: currentPrices, names: currentNames, categories: currentCategories });
        }
        currentPrices = [];
        currentNames = [];
        currentCategories = new Map();
        nameIndex = 0;
        inPriceBlock = true;
        continue;
      }

      if (pricePattern.test(line)) {
        currentPrices.push(line);
        inPriceBlock = true;
      } else {
        if (inPriceBlock && currentPrices.length > 0) {
          inPriceBlock = false;
        }
        // Skip title lines like "CARTA SAN PATRICIO"
        const isTitle = /^carta\s/i.test(line) || line.length < 3;
        if (isTitle) continue;

        // Check if it's a known category header (not a dish name)
        if (this.isCategoryHeader(line)) {
          currentCategories.set(nameIndex, line);
          continue;
        }

        currentNames.push(line);
        nameIndex++;
      }
    }
    // Don't forget the last page
    if (currentPrices.length > 0 || currentNames.length > 0) {
      pages.push({ prices: currentPrices, names: currentNames, categories: currentCategories });
    }

    // Now match prices to names
    const items: RawMenuItem[] = [];
    for (const page of pages) {
      let currentCategory: string | null = null;
      let priceIdx = 0;

      for (let i = 0; i < page.names.length; i++) {
        // Check if there's a category before this name
        if (page.categories.has(i)) {
          currentCategory = this.titleCase(page.categories.get(i)!);
        }

        const name = page.names[i].replace(/\s{2,}/g, ' ').trim();
        if (name.length < 3 || this.isNoiseLine(name)) continue;

        // Check if next line is a continuation (e.g., "CARAMELIZADA" wrapping)
        let fullName = name;
        if (i + 1 < page.names.length && page.names[i + 1].length < 30 && page.names[i + 1][0] === page.names[i + 1][0].toUpperCase()) {
          // Could be a continuation, but only if next line doesn't look like a new dish
          // Skip for now to avoid merging separate dishes
        }

        const price = priceIdx < page.prices.length ? page.prices[priceIdx] : null;
        priceIdx++;

        // Check for description in parentheses
        const parenMatch = fullName.match(/\(([^)]+)\)/);
        const description = parenMatch ? parenMatch[1] : null;
        const cleanName = fullName.replace(/\([^)]+\)/, '').trim();

        items.push({
          name: cleanName,
          description,
          price,
          category: currentCategory,
          imageUrl: null,
        });
      }
    }

    return items;
  }

  // Fallback parser for menus without prices (e.g., carta.menu, tripadvisor)
  private parseMenuWithoutPrices(lines: string[]): RawMenuItem[] {
    const items: RawMenuItem[] = [];
    let currentCategory: string | null = null;

    // Broad multilingual food keywords
    const foodKeywords = /pasta|pizza|paella|ensalad|salad|sopa|soup|carn|meat|pescad|fish|pollo|chicken|ternera|cerdo|pork|marisco|seafood|arroz|rice|filete|burger|sandwich|tarta|cake|flan|helado|ice cream|gambas|langostino|bacalao|bacallà|pulpo|fideuá|fideuà|calamares|croqueta|foie|sorbet|bogavante|vieiras|cangrejo|señoret|solomillo|costillas|entrecot|carpaccio|tartar|risotto|ravioli|gnocchi|bruschetta|hummus|guacamole|burrata|mozzarella|presa|ibéric|secreto|lomo|chuleta|merluza|lubina|dorada|rape|salmón|atún|mejillones|almejas|navajas|percebes|langosta|cigalas|alcachofas|espárrago|coliflor|berenjena|pimiento|patatas|verdura|huevos|tortilla|jamón|queso|pan|vino|cerveza|postre|dessert|dulce|mousse|brownie|crème|profiterole|tiramisú|pannacotta/i;

    // Skip lines that are page titles / section intros
    const skipPattern = /^(nuestra|descubr|disfrut|bienvenid|visit|reserv|horario|teléfono|dirección|contacto|síguenos|follow|nuestro equipo|about us)/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isNoiseLine(line)) continue;
      if (line.length < 3 || line.length > 120) continue;
      if (skipPattern.test(line)) continue;

      const isAllCaps = line === line.toUpperCase() && line.length > 3;

      // Detect categories
      if (isAllCaps && line.length < 40) {
        currentCategory = this.titleCase(line);
        continue;
      }

      // Check if next line is a description (starts with : or is a longer explanatory text)
      let description: string | null = null;
      if (i + 1 < lines.length) {
        const next = lines[i + 1];
        if (next.startsWith(':') || next.startsWith('-')) {
          description = next.replace(/^[:\-]\s*/, '').trim();
          i++;
        } else if (!foodKeywords.test(next) && next.length > 20 && next.length < 150 && !this.isNoiseLine(next)) {
          // Might be a description if it's long and doesn't look like another dish
          const nextHasCapStart = next[0] === next[0].toUpperCase();
          if (!nextHasCapStart || next.includes(',')) {
            description = next;
            i++;
          }
        }
      }

      // Accept if it looks like food
      if (foodKeywords.test(line)) {
        items.push({
          name: line.replace(/\s{2,}/g, ' ').trim(),
          description,
          price: null,
          category: currentCategory,
          imageUrl: null,
        });
      }
    }

    return items.slice(0, 150);
  }

  // ──────────────────────────────────────────────
  // Noise detection
  // ──────────────────────────────────────────────
  private isNoiseLine(line: string): boolean {
    const lower = line.toLowerCase();
    return (
      line.startsWith('<') || line.startsWith('{') || line.startsWith('//') ||
      line.includes('function(') || line.includes('window.') || line.includes('document.') ||
      line.includes('var ') || line.includes('const ') || line.includes('let ') ||
      /\.(js|css|png|jpg|gif|woff|svg)/.test(lower) ||
      lower.includes('cookie') || lower.includes('privacy policy') ||
      lower.includes('copyright') || lower.includes('all rights reserved') ||
      lower.includes('terms of service') || lower.includes('sign in') ||
      lower.includes('log in') || lower.includes('subscribe') ||
      lower.includes('newsletter') || lower.includes('follow us') ||
      /^\d+$/.test(line) || // just a number
      /^https?:\/\//.test(line) // just a URL
    );
  }

  // ──────────────────────────────────────────────
  // Translation
  // ──────────────────────────────────────────────
  private async translateItems(items: RawMenuItem[], targetLanguage: string): Promise<any[]> {
    if (items.length === 0) return [];

    const textsToTranslate = items.flatMap(item =>
      [item.name, item.description, item.category].filter(Boolean),
    ) as string[];

    if (textsToTranslate.length === 0) return this.formatItems(items);

    try {
      const [translations] = await this.translateClient.translate(textsToTranslate, targetLanguage);
      const map = new Map<string, string>();
      textsToTranslate.forEach((text, idx) => {
        map.set(text, Array.isArray(translations) ? translations[idx] : translations);
      });

      return items.map((item, idx) => ({
        id: `item-${idx}`,
        name: map.get(item.name) || item.name,
        nameOriginal: item.name,
        description: item.description ? (map.get(item.description) || item.description) : null,
        descriptionOriginal: item.description,
        ingredients: null,
        price: item.price,
        priceValue: item.price ? parseFloat(item.price.replace(/[^0-9.,]/g, '').replace(',', '.')) || null : null,
        currency: item.price ? this.detectCurrency(item.price) : null,
        category: item.category ? (map.get(item.category) || item.category) : null,
        imageUrl: item.imageUrl || null,
      }));
    } catch (err) {
      this.logger.warn('Translation failed, returning originals', err);
      return this.formatItems(items);
    }
  }

  private formatItems(items: RawMenuItem[]): any[] {
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
      imageUrl: item.imageUrl || null,
    }));
  }

  // ──────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────
  private extractCity(address: string): string {
    const parts = address.split(',');
    return parts[parts.length > 2 ? parts.length - 2 : 0]?.trim() || '';
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Known category headers in multiple languages — these are NOT dish names
  private isCategoryHeader(line: string): boolean {
    const lower = line.toLowerCase().trim();
    const categoryKeywords = [
      // Spanish
      'para empezar', 'entrantes', 'ensaladas', 'pescados', 'carnes', 'arroces',
      'postres', 'bebidas', 'vinos', 'sopas', 'aperitivos', 'guarniciones',
      'primeros', 'segundos', 'principales', 'acompañamientos', 'carta',
      // English
      'starters', 'appetizers', 'mains', 'main courses', 'desserts', 'beverages',
      'drinks', 'soups', 'salads', 'sides', 'entrees', 'specials',
      // Italian
      'antipasti', 'primi', 'primi piatti', 'secondi', 'secondi piatti',
      'contorni', 'dolci', 'bevande', 'insalate',
      // French
      'entrées', 'plats', 'plats principaux', 'desserts', 'boissons', 'soupes',
      // Portuguese
      'entradas', 'pratos principais', 'sobremesas', 'bebidas', 'saladas',
      // German
      'vorspeisen', 'hauptgerichte', 'nachspeisen', 'beilagen', 'getränke', 'suppen',
      // Catalan / Valencian
      'per a començar', 'de la mar', 'de la terra', 'per a endolcir',
      'per a canviar de sabor',
    ];
    return categoryKeywords.some(kw => lower === kw || lower === kw.toUpperCase());
  }

  private titleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }

  private detectCurrency(price: string): string {
    if (price.includes('€')) return 'EUR';
    if (price.includes('R$')) return 'BRL';
    if (price.includes('$')) return 'USD';
    if (price.includes('£')) return 'GBP';
    if (price.includes('¥')) return 'JPY';
    if (price.includes('₹')) return 'INR';
    if (price.includes('CHF')) return 'CHF';
    return 'EUR';
  }
}
