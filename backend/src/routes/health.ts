import { Router, Request, Response } from 'express';
import { testConnection } from '../database/connection';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRouter = Router();

/**
 * GET /health
 * Lightweight process-level health check.
 * Returns 200 as long as the server process is running.
 * Includes a non-blocking DB connectivity sub-check.
 */
healthRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = await testConnection();

    res.status(db.status === 'ok' ? 200 : 207).json({
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
    });
  })
);

/**
 * GET /health/db
 * Dedicated database-only health check for load balancers or monitoring
 * tools that want a simple pass/fail on DB connectivity.
 */
healthRouter.get(
  '/db',
  asyncHandler(async (_req: Request, res: Response) => {
    const db = await testConnection();

    res.status(db.status === 'ok' ? 200 : 503).json({
      status: db.status,
      latency_ms: db.latency_ms,
      pool: db.pool,
      ...(db.error ? { error: db.error } : {}),
    });
  })
);
