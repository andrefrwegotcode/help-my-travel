import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../config/prisma.service';
import { MENU_QUEUE } from './menu-discovery.processor';

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue(MENU_QUEUE) private menuQueue: Queue,
  ) {}

  async getMenu(placeId: string, language: string) {
    // Check DB cache first
    const cached = await this.prisma.menuCache.findUnique({
      where: { placeId_language: { placeId, language } },
    });

    if (cached && cached.expiresAt > new Date()) {
      const items = cached.items as any[];
      return {
        placeId,
        language,
        categories: this.groupByCategory(items),
        source: cached.source,
        sourceUrl: cached.sourceUrl,
        fetchedAt: cached.fetchedAt,
        expiresAt: cached.expiresAt,
        cached: true,
      };
    }

    // Dispatch background job
    const job = await this.menuQueue.add(
      'discover',
      { placeId, language },
      {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    return {
      jobId: job.id?.toString(),
      status: 'pending',
      message: 'Menu discovery started. Poll /menu/status/:jobId for updates.',
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.menuQueue.getJob(jobId);
    if (!job) return { status: 'not_found' };

    const state = await job.getState();
    const progress = job.progress();

    if (state === 'completed') {
      const { placeId, language } = job.data;
      const cached = await this.prisma.menuCache.findUnique({
        where: { placeId_language: { placeId, language } },
      });
      if (cached) {
        const items = cached.items as any[];
        return {
          status: 'completed',
          menu: {
            placeId,
            language,
            categories: this.groupByCategory(items),
            source: cached.source,
            sourceUrl: cached.sourceUrl,
            fetchedAt: cached.fetchedAt,
          },
        };
      }
    }

    if (state === 'failed') {
      return { status: 'failed', error: job.failedReason };
    }

    return { status: state, progress };
  }

  async scanUrl(url: string, placeId: string, language: string) {
    const job = await this.menuQueue.add(
      'scan-url',
      { placeId, language, url },
      { removeOnComplete: 50, removeOnFail: 20, attempts: 1 },
    );
    return {
      jobId: job.id?.toString(),
      status: 'pending',
      message: 'QR code URL scan started. Poll /menu/status/:jobId for updates.',
    };
  }

  async scanPhoto(file: Express.Multer.File, placeId: string, language: string) {
    const imageBase64 = file.buffer.toString('base64');
    const imageMimeType = file.mimetype;

    const job = await this.menuQueue.add(
      'scan-photo',
      { placeId, language, imageBase64, imageMimeType },
      { removeOnComplete: 50, removeOnFail: 20, attempts: 1 },
    );
    return {
      jobId: job.id?.toString(),
      status: 'pending',
      message: 'Photo OCR scan started. Poll /menu/status/:jobId for updates.',
    };
  }

  async invalidateCache(placeId: string) {
    await this.prisma.menuCache.deleteMany({ where: { placeId } });
    return { message: 'Menu cache invalidated' };
  }

  private groupByCategory(items: any[]) {
    const categories = new Map<string, any[]>();
    const uncategorized = 'Other';

    for (const item of items) {
      const cat = item.category || uncategorized;
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(item);
    }

    return Array.from(categories.entries()).map(([name, items]) => ({ name, items }));
  }
}
