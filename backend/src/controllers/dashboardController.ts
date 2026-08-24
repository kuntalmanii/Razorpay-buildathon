/**
 * controllers/dashboardController.ts — Dashboard endpoints.
 */

import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboardService';
import { sendSuccess } from '../utils/response';

export class DashboardController {
  public static async getSummary(req: Request, res: Response): Promise<void> {
    const merchantId = typeof req.query.merchant_id === 'string' ? req.query.merchant_id : undefined;
    const summary = await DashboardService.getSummary(merchantId);
    sendSuccess(res, summary);
  }
}
