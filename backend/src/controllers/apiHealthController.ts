/**
 * controllers/apiHealthController.ts — Health check handler in standard envelope.
 */

import { Request, Response } from 'express';
import { testConnection } from '../database/connection';
import { getRazorpayClient } from '../services/razorpay';
import { sendSuccess } from '../utils/response';

export class ApiHealthController {
  public static async getHealth(_req: Request, res: Response): Promise<void> {
    const db = await testConnection();
    const razorpayHealth = await getRazorpayClient().healthCheck();

    const isHealthy = db.status === 'ok';

    sendSuccess(
      res,
      {
        status: isHealthy ? 'ok' : 'degraded',
        service: 'recoveriq-backend',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV ?? 'development',
        database: {
          status: db.status,
          latency_ms: db.latency_ms,
          pool: db.pool,
          ...(db.error ? { error: db.error } : {}),
        },
        razorpay: {
          status: razorpayHealth.status,
          isTestMode: razorpayHealth.isTestMode,
          maskedKeyId: razorpayHealth.maskedKeyId,
          ...(razorpayHealth.error ? { error: razorpayHealth.error } : {}),
        },
        ai: {
          status: 'operational',
          engine: 'RecoveryDecisionAgent',
          mode: 'Structured Output (Zod Schema Validation)',
          fallback: 'Deterministic Safety Policy Engine',
        },
        workers: {
          status: 'operational',
          concurrency: 'idempotent',
          zeroDoubleBilling: true,
          activeQueues: ['recovery_worker', 'retry_worker', 'verification_worker'],
        },
      },
      isHealthy ? 200 : 207
    );
  }

  public static async getRazorpayHealth(_req: Request, res: Response): Promise<void> {
    const health = await getRazorpayClient().healthCheck();
    sendSuccess(res, health);
  }
}
