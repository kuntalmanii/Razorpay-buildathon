/**
 * controllers/casesController.ts — Recovery cases endpoints.
 */

import { Request, Response } from 'express';
import { CasesService } from '../services/casesService';
import { parseCasesFilter } from '../validators/cases';
import { parsePagination } from '../validators/pagination';
import { buildPaginationMeta, sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class CasesController {
  /**
   * GET /api/recovery-cases
   */
  public static async listCases(req: Request, res: Response): Promise<void> {
    const paginationResult = parsePagination(req.query);
    if ('error' in paginationResult && paginationResult.error) {
      throw paginationResult.error;
    }

    const filterResult = parseCasesFilter(req.query);
    if (filterResult instanceof ValidationError) {
      throw filterResult;
    }

    const { cases, total } = await CasesService.listCases(filterResult, paginationResult);
    const meta = buildPaginationMeta(total, paginationResult.page, paginationResult.limit);

    sendSuccess(res, cases, 200, meta);
  }

  /**
   * GET /api/recovery-cases/:id
   */
  public static async getCaseById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Case ID is required');
    }

    const item = await CasesService.getCaseById(id);
    sendSuccess(res, item);
  }

  /**
   * GET /api/recovery-cases/:id/audit
   */
  public static async getCaseAudit(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Case ID is required');
    }

    const logs = await CasesService.getCaseAuditLogs(id);
    sendSuccess(res, logs);
  }

  /**
   * GET /api/recovery-cases/:id/actions
   */
  public static async getCaseActions(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Case ID is required');
    }

    const { ActionsService } = await import('../services/actionsService');
    const { actions } = await ActionsService.listActions({ case_id: id }, { page: 1, limit: 50, offset: 0 });
    sendSuccess(res, actions);
  }

  /**
   * POST /api/recovery-cases
   */
  public static async createCase(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      customer_id?: string;
      customer_name?: string;
      customer_email?: string;
      payment_id?: string;
      subscription_id?: string;
      amount_at_risk?: number | string;
      currency?: string;
      failure_category?: string;
      risk_score?: number | string;
      recovery_probability?: number | string;
      recovery_reason?: string;
    };

    const amountAtRisk = Number(body.amount_at_risk);
    const riskScore = Number(body.risk_score ?? 50);

    if (!body.failure_category) {
      throw new ValidationError('failure_category is required');
    }
    let failureCategory = body.failure_category.toLowerCase().trim();
    if (failureCategory === 'network_failure') failureCategory = 'network_error';
    if (failureCategory === 'subscription_halted') failureCategory = 'subscription_halt';
    if (failureCategory === 'customer_abandoned') failureCategory = 'authentication_failure';

    if (!amountAtRisk || amountAtRisk <= 0) {
      throw new ValidationError('amount_at_risk must be a positive number (in paise)');
    }

    const newCase = await CasesService.createCase({
      customer_id: body.customer_id,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      payment_id: body.payment_id,
      subscription_id: body.subscription_id,
      amount_at_risk: amountAtRisk,
      currency: body.currency || 'INR',
      failure_category: failureCategory,
      risk_score: riskScore,
      recovery_probability: body.recovery_probability ? Number(body.recovery_probability) : 0.5,
      recovery_reason: body.recovery_reason,
    });

    sendSuccess(res, newCase, 201);
  }

  /**
   * PATCH /api/recovery-cases/:id
   */
  public static async updateCase(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    if (!id || id.trim().length === 0) {
      throw new ValidationError('Case ID is required');
    }

    const body = req.body as {
      status?: string;
      risk_score?: number | string;
      recovery_probability?: number | string;
      recovery_reason?: string | null;
      recovered_amount?: number | string | null;
      resolved_at?: string | null;
      customer_name?: string;
      customer_email?: string;
    };

    const payload: Parameters<typeof CasesService.updateCase>[1] = {};
    if (body.status !== undefined) payload.status = body.status;
    if (body.risk_score !== undefined) payload.risk_score = Number(body.risk_score);
    if (body.recovery_probability !== undefined) payload.recovery_probability = Number(body.recovery_probability);
    if ('recovery_reason' in body) payload.recovery_reason = body.recovery_reason ?? null;
    if ('recovered_amount' in body) payload.recovered_amount = body.recovered_amount != null ? Number(body.recovered_amount) : null;
    if ('resolved_at' in body) payload.resolved_at = body.resolved_at ?? null;
    if (body.customer_name !== undefined) payload.customer_name = body.customer_name;
    if (body.customer_email !== undefined) payload.customer_email = body.customer_email;

    const updated = await CasesService.updateCase(id, payload);
    sendSuccess(res, updated);
  }
}
