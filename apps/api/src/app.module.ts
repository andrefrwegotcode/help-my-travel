import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PlacesModule } from './modules/places/places.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrderModule } from './modules/order/order.module';
import { TranslationModule } from './modules/translation/translation.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PhotosModule } from './modules/photos/photos.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaModule } from './config/prisma.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),

    // Event emitter for job status updates
    EventEmitterModule.forRoot(),

    // BullMQ queue (Redis)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('REDIS_URL') || 'redis://localhost:6379',
      }),
    }),

    // Feature modules
    PrismaModule,
    AuthModule,
    UsersModule,
    PlacesModule,
    MenuModule,
    OrderModule,
    TranslationModule,
    ReviewsModule,
    PhotosModule,
    AdminModule,
  ],
})
export class AppModule {}
