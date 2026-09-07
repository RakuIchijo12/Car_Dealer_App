import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';
import { AppModule } from './app.module';

/**
 * Serverless entry point for the API.
 *
 * `main.ts` still owns the long-lived local server. This module builds the same
 * Nest application around a bare Express instance and returns it WITHOUT
 * listening, so a platform that hands us (req, res) can drive it directly.
 *
 * Two things differ from the local server on purpose:
 *
 *  - No `useStaticAssets` for /uploads. A serverless filesystem is ephemeral
 *    and read-only outside /tmp, so the vehicle photography is served as static
 *    assets by the CDN instead (see frontend-app/public/uploads).
 *  - The app is cached across invocations. A cold start pays for the Nest
 *    bootstrap and the Postgres pool once; warm invocations reuse both.
 */

let cached: Promise<Express> | null = null;

async function build(): Promise<Express> {
  const server = express();

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    // The platform captures stdout per invocation; keep it to what matters.
    logger: ['error', 'warn'],
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );

  // The browser calls /api on its own origin in production, so CORS only
  // matters if the API is pointed at from somewhere else. Honour an explicit
  // allow-list when one is configured and stay closed by default otherwise.
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length) {
    app.enableCors({ origin: origins.includes('*') ? true : origins, credentials: true });
  }

  app.setGlobalPrefix('api');
  await app.init();

  Logger.log('Velora API initialised (serverless)', 'Bootstrap');
  return server;
}

/** Returns the initialised Express app, building it once per warm instance. */
export function createHandler(): Promise<Express> {
  if (!cached) {
    // Cache the promise, not the result: concurrent cold invocations must share
    // one bootstrap rather than each opening their own connection pool.
    cached = build().catch((err) => {
      cached = null; // let the next invocation retry rather than serving a dead app
      throw err;
    });
  }
  return cached;
}
