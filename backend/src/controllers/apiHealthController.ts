/**
 * controllers/apiHealthController.ts — Health check handler in standard envelope.
 */

import { Request, Response } from 'express';
import { testConnection } from '../database/connection';
import { sendSuccess } from '../utils/response';

export class ApiHealthController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
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
  }
}
