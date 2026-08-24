/**
 * simulation/simulation.controller.ts
 *
 * Controller exposing DEVELOPMENT-ONLY simulation triggers and scenario runs.
 * STRICTLY FORBIDDEN IN PRODUCTION.
 */

import { Request, Response } from 'express';
import { SimulationManager } from './simulation-manager';
import { SimulationType } from './simulation.types';
import { RazorpayFaultsScenario } from './scenarios/razorpay-faults';
import { AiFaultsScenario } from './scenarios/ai-faults';
import { WebhookFaultsScenario } from './scenarios/webhook-faults';
import { StateFaultsScenario } from './scenarios/state-faults';
import { sendSuccess } from '../utils/response';
import { config } from '../config';

export class SimulationController {
  /**
   * Middleware guard to forbid in production
   */
  private static checkDevOnly(res: Response): boolean {
    if (config.server.nodeEnv === 'production') {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Simulation endpoints are strictly disabled in production environments',
        },
      });
      return false;
    }
    return true;
  }

  /**
   * GET /api/simulation/status
   */
  public static async getStatus(req: Request, res: Response): Promise<void> {
    if (!SimulationController.checkDevOnly(res)) return;
    const faults = SimulationManager.getActiveFaults();
    sendSuccess(res, { activeFaults: faults, devMode: true });
  }

  /**
   * POST /api/simulation/inject
   */
  public static async injectFault(req: Request, res: Response): Promise<void> {
    if (!SimulationController.checkDevOnly(res)) return;
    const { type, delayMs, remainingTriggers, metadata } = req.body as {
      type: SimulationType;
      delayMs?: number;
      remainingTriggers?: number;
      metadata?: Record<string, unknown>;
    };

    if (!type) {
      res.status(400).json({ success: false, error: { code: 'INVALID_TYPE', message: 'Simulation type is required' } });
      return;
    }

    const fault = await SimulationManager.injectFault(type, { delayMs, remainingTriggers, metadata });
    sendSuccess(res, fault, 201);
  }

  /**
   * POST /api/simulation/reset
   */
  public static async resetFaults(req: Request, res: Response): Promise<void> {
    if (!SimulationController.checkDevOnly(res)) return;
    SimulationManager.resetAll();
    sendSuccess(res, { message: 'All simulated faults reset' });
  }

  /**
   * POST /api/simulation/run-scenario
   */
  public static async runScenario(req: Request, res: Response): Promise<void> {
    if (!SimulationController.checkDevOnly(res)) return;
    const body = req.body as {
      scenarioType?: SimulationType;
      scenario?: SimulationType;
      caseId?: string;
    };
    const scenarioType = body.scenarioType || body.scenario;

    let targetCaseId = body.caseId;
    if (!targetCaseId) {
      try {
        const { getPool } = await import('../database/connection');
        const pool = getPool();
        const caseRes = await pool.query<{ case_id: string }>(
          'SELECT case_id FROM revenue_risk_cases ORDER BY created_at DESC LIMIT 1'
        );
        targetCaseId = caseRes.rows[0]?.case_id || 'case_dev_001';
      } catch {
        targetCaseId = 'case_dev_001';
      }
    }

    let result;
    switch (scenarioType) {
      case 'RAZORPAY_TIMEOUT':
      case 'RAZORPAY_500_ERROR':
        result = await RazorpayFaultsScenario.runTimeoutAndRecovery(targetCaseId);
        break;

      case 'AI_TIMEOUT':
        result = await AiFaultsScenario.runAiTimeoutAndFallback(targetCaseId);
        break;

      case 'AI_MALFORMED_RESPONSE':
        result = await AiFaultsScenario.runMalformedAiResponseBlocked(targetCaseId);
        break;

      case 'DUPLICATE_WEBHOOK':
      case 'WEBHOOK_PROCESSING_DELAY':
        result = await WebhookFaultsScenario.runDuplicateWebhookIgnored();
        break;

      case 'PAYMENT_ALREADY_SUCCESSFUL':
        result = await StateFaultsScenario.runPaymentAlreadySuccessfulBlocksRecovery(targetCaseId);
        break;

      case 'RECOVERY_ACTION_DUPLICATED':
        result = await StateFaultsScenario.runDuplicateActionPrevented(targetCaseId);
        break;

      default:
        res.status(400).json({
          success: false,
          error: { code: 'UNKNOWN_SCENARIO', message: `Scenario type ${scenarioType} not supported` },
        });
        return;
    }

    sendSuccess(res, result, 200);
  }
}
