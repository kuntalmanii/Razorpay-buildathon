/**
 * middleware/rateLimiter.ts
 *
 * Lightweight, in-memory sliding-window rate limiter for REST and Webhook endpoints.
 * Protects against Layer-7 volumetric flooding without introducing external dependencies.
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipInTests?: boolean;
}

interface ClientRecord {
  count: number;
  resetTime: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests from this IP, please try again later.', skipInTests = true } = options;
  const clients = new Map<string, ClientRecord>();

  // Periodically clean up expired entries (every 60s)
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of clients.entries()) {
      if (now > record.resetTime) {
        clients.delete(ip);
      }
    }
  }, 60000);

  // Prevent timer from holding process open in tests
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    if (skipInTests && process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || 'unknown_client';
    const now = Date.now();
    let record = clients.get(ip);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      clients.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfterSeconds: resetSeconds,
        },
      });
      return;
    }

    next();
  };
}

export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300,            // 300 req/min for general API
});

export const webhookIngressLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,           // 1000 req/min for high-throughput webhook ingress
});
