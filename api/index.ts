import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ValidationPipe } from '@nestjs/common';
let app: any;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.enableCors({
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    });
    app.setGlobalPrefix('api');
    await app.init();
  }
  return app;
}

export default async function handler(req: any, res: any) {
  const nestApp = await bootstrap();
  const expressInstance = nestApp.getHttpAdapter().getInstance();
  expressInstance(req, res);
}
