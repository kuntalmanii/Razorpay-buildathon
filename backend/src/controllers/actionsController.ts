/**
 * controllers/actionsController.ts — Recovery actions endpoints.
 */

import { Request, Response } from 'express';
import { ActionsService } from '../services/actionsService';
import { parseActionsFilter } from '../validators/cases';
import { parsePagination } from '../validators/pagination';
import { buildPaginationMeta, sendSuccess } from '../utils/response';
import { ValidationError } from '../utils/errors';

export class ActionsController {
  /**
   * GET /api/recovery-actions
   */
  public static async listActions(req: Request, res: Response): Promise<void> {
    const paginationResult = parsePagination(req.query);
    if ('error' in paginationResult && paginationResult.error) {
      throw paginationResult.error;
    }

    const filterResult = parseActionsFilter(req.query);
    if (filterResult instanceof ValidationError) {
      throw filterResult;
    }

    const { actions, total } = await ActionsService.listActions(filterResult, paginationResult);
    const meta = buildPaginationMeta(total, paginationResult.page, paginationResult.limit);

    sendSuccess(res, actions, 200, meta);
  }
}
