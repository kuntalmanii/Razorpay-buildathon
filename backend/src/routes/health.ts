import { Router, Request, Response } from 'express';
import { testConnection } from '../database/connection';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const healthRouter = Router();

/**
 * GET /health
 * Lightweight process-level health check.
 */
healthRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = await testConnection();

    sendSuccess(
      res,
      {
        status: db.status === 'ok' ? 'ok' : 'degraded',
        service: 'recoveriq-backend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? 'development',
        database: {
          status: db.status,
          latency_ms: db.latency_ms,
          pool: db.pool,
          ...(db.error ? { error: db.error } : {}),
        },
      },
      db.status === 'ok' ? 200 : 207
    );
  })
);

/**
 * GET /health/db
 * Dedicated database-only health check.
 */
healthRouter.get(
  '/db',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = await testConnection();

    sendSuccess(
      res,
      {
        status: db.status,
        latency_ms: db.latency_ms,
        pool: db.pool,
        ...(db.error ? { error: db.error } : {}),
      },
      db.status === 'ok' ? 200 : 503
    );
  })
);
