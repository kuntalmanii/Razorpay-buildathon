/**
 * controllers/evaluationController.ts — Benchmark evaluation endpoints.
 */

import { Request, Response } from 'express';
import { EvaluationService } from '../services/evaluationService';
import { sendSuccess } from '../utils/response';

export class EvaluationController {
  /**
   * GET /api/evaluation
   */
  public static async getEvaluation(req: Request, res: Response): Promise<void> {
    const report = EvaluationService.getLatestReport();
    sendSuccess(res, report);
  }

  /**
   * POST /api/evaluation/run
   */
  public static async runEvaluation(req: Request, res: Response): Promise<void> {
    const report = await EvaluationService.runEvaluation();
    sendSuccess(res, report, 201);
  }
}
