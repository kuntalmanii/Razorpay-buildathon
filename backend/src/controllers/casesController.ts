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
}
