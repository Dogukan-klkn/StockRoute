import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  });

  // Global DTO doğrulaması (class-validator): geçersiz gövde → 400.
  // whitelist: DTO'da tanımsız alanları düşürür; forbidNonWhitelisted: fazladan
  // alan gelirse hata verir; transform: gövdeyi DTO sınıf örneğine dönüştürür.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI dokümanı (@nestjs/swagger ile üretilir)
  const config = new DocumentBuilder()
    .setTitle('StockRoute API')
    .setDescription('Çok kiracılı kurumsal envanter & kaynak yönetim sistemi API dokümantasyonu')
    .setVersion('0.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Görüntüleme arayüzü: Swagger UI yerine Scalar (/docs)
  app.use(
    '/docs',
    apiReference({
      content: document,
    }),
  );

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`StockRoute API ready on http://localhost:${port} — docs: /docs`);
}

void bootstrap();
