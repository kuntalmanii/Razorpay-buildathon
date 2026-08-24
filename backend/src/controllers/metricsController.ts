/**
 * controllers/metricsController.ts — Metrics endpoints.
 */

import { Request, Response } from 'express';
import { MetricsService } from '../services/metricsService';
import { sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class MetricsController {
  /**
   * GET /api/metrics
   */
  public static async getMetrics(req: Request, res: Response): Promise<void> {
    let days = 30;
    if (req.query.days !== undefined) {
      const parsed = parseInt(req.query.days as string, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        throw new ValidationError('Days parameter must be an integer between 1 and 365', {
          days: 'Must be between 1 and 365',
        });
      }
      days = parsed;
    }

    const metrics = await MetricsService.getMetrics(days);
    sendSuccess(res, metrics);
  }
}
