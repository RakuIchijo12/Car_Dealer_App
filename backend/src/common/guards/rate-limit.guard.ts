import {
  CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Tiny in-memory sliding-window limiter for unauthenticated endpoints
 * (the public enquiry form). Keeps the dependency list unchanged; for a
 * multi-instance deploy swap the Map for Redis.
 *
 * Constructor takes no arguments — Nest instantiates guards through DI and
 * would try to resolve any parameter as a provider.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly limit = 5;
  private readonly windowMs = 60_000;
  private readonly hits = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.ip ?? 'unknown';
    const now = Date.now();

    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);

    if (recent.length >= this.limit) {
      throw new HttpException(
        'Too many requests — please wait a minute before sending another message.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    recent.push(now);
    this.hits.set(key, recent);

    // Opportunistic cleanup so the map cannot grow without bound.
    if (this.hits.size > 5_000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
      }
    }

    return true;
  }
}
