import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../config/prisma.service';

@Injectable()
export class PhotosService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async findByPlace(placeId: string) {
    return this.prisma.photo.findMany({
      where: { placeId },
      include: { user: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    userId: string,
    files: Express.Multer.File[],
    data: { placeId: string; placeName: string; caption?: string },
  ) {
    if (!files || files.length === 0) throw new BadRequestException('No files uploaded');

    const storageType = this.config.get('STORAGE_TYPE') || 'local';
    const photos: Array<Record<string, unknown>> = [];

    for (const file of files) {
      let url: string;

      if (storageType === 's3') {
        url = await this.uploadToS3(file);
      } else {
        url = await this.saveLocally(file);
      }

      const photo = await this.prisma.photo.create({
        data: {
          userId,
          placeId: data.placeId,
          placeName: data.placeName,
          url,
          caption: data.caption || null,
        },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      });

      photos.push(photo);
    }

    return photos;
  }

  async remove(id: string, userId: string, role: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    if (photo.userId !== userId && role !== 'ADMIN') throw new ForbiddenException('Not your photo');

    // Delete file if stored locally
    if (photo.url.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), photo.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await this.prisma.photo.delete({ where: { id } });
    return { message: 'Photo deleted' };
  }

  private async saveLocally(file: Express.Multer.File): Promise<string> {
    const uploadsDir = this.config.get('UPLOADS_DIR') || './uploads';
    const dir = path.join(process.cwd(), uploadsDir, 'photos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const ext = path.extname(file.originalname);
    const filename = `${uuid()}${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, file.buffer);

    return `/uploads/photos/${filename}`;
  }

  private async uploadToS3(file: Express.Multer.File): Promise<string> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: this.config.get('AWS_REGION'),
      endpoint: this.config.get('AWS_ENDPOINT'),
    });

    const bucket = this.config.get('AWS_S3_BUCKET');
    const ext = path.extname(file.originalname);
    const key = `photos/${uuid()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${bucket}.s3.${this.config.get('AWS_REGION')}.amazonaws.com/${key}`;
  }
}
