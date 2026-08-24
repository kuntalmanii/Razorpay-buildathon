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

  public static async getAuditLogs(req: Request, res: Response): Promise<void> {
    const { parsePagination } = await import('../validators/pagination');
    const { buildPaginationMeta } = await import('../utils/response');
    const { getPool } = await import('../database/connection');

    const paginationResult = parsePagination(req.query);
    const pagination = 'error' in paginationResult ? { page: 1, limit: 50, offset: 0 } : paginationResult;

    const pool = getPool();
    const entityId = typeof req.query.entity_id === 'string' ? req.query.entity_id : undefined;
    const entityType = typeof req.query.entity_type === 'string' ? req.query.entity_type : undefined;

    const whereClauses: string[] = [];
    const params: unknown[] = [];
    let pIdx = 1;

    if (entityId) {
      whereClauses.push(`entity_id = $${pIdx++}`);
      params.push(entityId);
    }
    if (entityType) {
      whereClauses.push(`entity_type = $${pIdx++}`);
      params.push(entityType);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const countRes = await pool.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM audit_logs ${whereSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const itemsRes = await pool.query(
      `SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...params, pagination.limit, pagination.offset]
    );

    const meta = buildPaginationMeta(total, pagination.page, pagination.limit);
    sendSuccess(res, itemsRes.rows, 200, meta);
  }
}
