import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async findByPlace(placeId: string) {
    return this.prisma.review.findMany({
      where: { placeId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, data: { placeId: string; placeName: string; rating: number; comment?: string }) {
    return this.prisma.review.create({
      data: { userId, ...data },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async update(id: string, userId: string, data: { rating?: number; comment?: string }) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId) throw new ForbiddenException('Not your review');

    return this.prisma.review.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async remove(id: string, userId: string, role: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.userId !== userId && role !== 'ADMIN') throw new ForbiddenException('Not your review');

    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted' };
  }
}
