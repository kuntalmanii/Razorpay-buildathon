import { Router, Request, Response } from 'express';

export const healthRouter = Router();

/**
 * GET /health
 * Lightweight health-check used by load balancers, CI pipelines, and frontend
 * connectivity checks. Returns 200 as long as the process is running.
 */
healthRouter.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'recoveriq-backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});
