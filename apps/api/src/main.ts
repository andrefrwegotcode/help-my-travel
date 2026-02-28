import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // CORS — allow mobile app + admin panel + any Expo/tunnel origins
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Help My Travel API')
    .setDescription(
      'API for the Help My Travel app — discover nearby restaurants, translate menus, and communicate with staff.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication')
    .addTag('users', 'User management')
    .addTag('places', 'Restaurant discovery (Google Places)')
    .addTag('menu', 'Menu discovery, scraping & translation')
    .addTag('order', 'Order generation')
    .addTag('translation', 'Bidirectional real-time translation')
    .addTag('reviews', 'Restaurant reviews')
    .addTag('photos', 'Restaurant photos')
    .addTag('admin', 'Admin panel endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || process.env.API_PORT || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`API running on port ${port}`);
  logger.log(`Swagger docs at /api`);
}

bootstrap();
