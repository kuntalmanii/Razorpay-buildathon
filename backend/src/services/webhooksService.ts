/**
 * services/webhooksService.ts — Business logic for webhook event logs.
 */

import { getPool } from '../database/connection';
import { WebhookEvent } from '../types/domain';
import { ParsedPagination } from '../validators/pagination';

export interface WebhooksFilter {
  event_type?: string;
  processing_status?: string;
}

export class WebhooksService {
  /**
   * List webhook events with filtering and pagination.
   */
  public static async listEvents(
    filter: WebhooksFilter,
    pagination: ParsedPagination
  ): Promise<{ events: WebhookEvent[]; total: number }> {
    const pool = getPool();
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filter.event_type) {
      whereClauses.push(`event_type = $${paramIndex++}`);
      values.push(filter.event_type);
    }

    if (filter.processing_status) {
      whereClauses.push(`processing_status = $${paramIndex++}`);
      values.push(filter.processing_status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM webhook_events
      ${whereSql};
    `;
    const countResult = await pool.query<{ total: number }>(countQuery, values);
    const total = countResult.rows[0]?.total ?? 0;

    const itemsQuery = `
      SELECT
        event_id,
        razorpay_event_id,
        event_type,
        signature_verified,
        processing_status,
        error_message,
        received_at,
        processed_at,
        created_at
      FROM webhook_events
      ${whereSql}
      ORDER BY received_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const itemsResult = await pool.query<WebhookEvent>(itemsQuery, [
      ...values,
      pagination.limit,
      pagination.offset,
    ]);

    return {
      events: itemsResult.rows,
      total,
    };
  }
}
