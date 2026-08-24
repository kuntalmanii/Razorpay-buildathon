/**
 * controllers/webhooksController.ts — Webhook events log endpoints.
 */

import { Request, Response } from 'express';
import { WebhooksService } from '../services/webhooksService';
import { parsePagination } from '../validators/pagination';
import { buildPaginationMeta, sendSuccess } from '../utils/response';

export class WebhooksController {
  /**
   * GET /api/webhooks/events
   */
  public static async listEvents(req: Request, res: Response): Promise<void> {
    const paginationResult = parsePagination(req.query);
    if ('error' in paginationResult && paginationResult.error) {
      throw paginationResult.error;
    }

    const event_type = typeof req.query.event_type === 'string' ? req.query.event_type : undefined;
    const processing_status = typeof req.query.processing_status === 'string' ? req.query.processing_status : undefined;

    const { events, total } = await WebhooksService.listEvents(
      { event_type, processing_status },
      paginationResult
    );
    const meta = buildPaginationMeta(total, paginationResult.page, paginationResult.limit);

    sendSuccess(res, events, 200, meta);
  }
}
