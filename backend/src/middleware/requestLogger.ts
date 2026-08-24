/**
 * middleware/requestLogger.ts — HTTP request/response logger.
 *
 * Logs every incoming request with method, URL, status code, duration, and requestId.
 * Uses the logger utility so output format (JSON vs pretty) matches NODE_ENV.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startAt = process.hrtime.bigint();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const elapsedNs = process.hrtime.bigint() - startAt;
    const elapsedMs = Number(elapsedNs) / 1_000_000;

    const meta = {
      requestId: req.requestId,
      method,
      url: originalUrl,
      status: res.statusCode,
      duration_ms: Math.round(elapsedMs * 100) / 100,
      ip,
    };

    if (res.statusCode >= 500) {
      logger.error(`${method} ${originalUrl} ${res.statusCode}`, meta);
    } else if (res.statusCode >= 400) {
      logger.warn(`${method} ${originalUrl} ${res.statusCode}`, meta);
    } else {
      logger.debug(`${method} ${originalUrl} ${res.statusCode}`, meta);
    }
  });

  next();
}
