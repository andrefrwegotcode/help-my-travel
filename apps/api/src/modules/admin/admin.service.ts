import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [users, reviews, photos, menuCaches] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.review.count(),
      this.prisma.photo.count(),
      this.prisma.menuCache.count(),
    ]);

    const newUsersToday = await this.prisma.user.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });

    const avgRating = await this.prisma.review.aggregate({ _avg: { rating: true } });

    return {
      users: { total: users, newToday: newUsersToday },
      reviews: { total: reviews, avgRating: avgRating._avg.rating?.toFixed(1) ?? 'N/A' },
      photos: { total: photos },
      menuCache: { total: menuCaches },
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? { OR: [{ email: { contains: search } }, { name: { contains: search } }] }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, email: true, name: true, language: true,
          role: true, avatar: true, createdAt: true,
          _count: { select: { reviews: true, photos: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getReviews(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count(),
    ]);
    return { reviews, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getPhotos(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [photos, total] = await Promise.all([
      this.prisma.photo.findMany({
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.photo.count(),
    ]);
    return { photos, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getMenuCaches(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [caches, total] = await Promise.all([
      this.prisma.menuCache.findMany({
        skip,
        take: limit,
        select: {
          id: true, placeId: true, language: true,
          source: true, sourceUrl: true, fetchedAt: true, expiresAt: true,
        },
        orderBy: { fetchedAt: 'desc' },
      }),
      this.prisma.menuCache.count(),
    ]);
    return { caches, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async createUser(dto: { name: string; email: string; password: string; role: 'USER' | 'ADMIN' }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hash, role: dto.role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    return user;
  }

  async updateUserRole(id: string, role: 'USER' | 'ADMIN') {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted' };
  }

  async deleteReview(id: string) {
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted by admin' };
  }

  async deletePhoto(id: string) {
    await this.prisma.photo.delete({ where: { id } });
    return { message: 'Photo deleted by admin' };
  }
}
