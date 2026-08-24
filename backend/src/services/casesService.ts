/**
 * services/casesService.ts — Business logic for revenue risk cases.
 */

import { getPool } from '../database/connection';
import { RiskCase, AuditLog } from '../types/domain';
import { NotFoundError } from '../utils/errors';
import { CasesFilter } from '../validators/cases';
import { ParsedPagination } from '../validators/pagination';

export class CasesService {
  /**
   * List recovery cases with filtering and pagination.
   */
  public static async listCases(
    filter: CasesFilter,
    pagination: ParsedPagination
  ): Promise<{ cases: RiskCase[]; total: number }> {
    const pool = getPool();
    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filter.status) {
      whereClauses.push(`c.status = $${paramIndex++}`);
      values.push(filter.status);
    }

    if (filter.failure_category) {
      whereClauses.push(`c.failure_category = $${paramIndex++}`);
      values.push(filter.failure_category);
    }

    if (filter.merchant_id) {
      whereClauses.push(`c.merchant_id = $${paramIndex++}`);
      values.push(filter.merchant_id);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total count query
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM revenue_risk_cases c
      ${whereSql};
    `;
    const countResult = await pool.query<{ total: number }>(countQuery, values);
    const total = countResult.rows[0]?.total ?? 0;

    // Items query with pagination and customer/merchant join
    const itemsQuery = `
      SELECT
        c.case_id,
        c.merchant_id,
        c.customer_id,
        c.payment_id,
        c.subscription_id,
        c.amount_at_risk::text,
        c.currency,
        c.failure_category,
        c.risk_score::text,
        c.recovery_probability::text,
        c.status,
        c.detected_at,
        c.resolved_at,
        c.recovered_amount::text,
        c.recovery_reason,
        c.created_at,
        c.updated_at,
        m.name AS merchant_name,
        cust.name AS customer_name,
        cust.email AS customer_email
      FROM revenue_risk_cases c
      LEFT JOIN merchants m ON c.merchant_id = m.merchant_id
      LEFT JOIN customers cust ON c.customer_id = cust.customer_id
      ${whereSql}
      ORDER BY c.detected_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `;

    const itemsResult = await pool.query<RiskCase>(itemsQuery, [
      ...values,
      pagination.limit,
      pagination.offset,
    ]);

    return {
      cases: itemsResult.rows,
      total,
    };
  }

  /**
   * Get a single recovery case by ID.
   */
  public static async getCaseById(caseId: string): Promise<RiskCase> {
    const pool = getPool();

    const query = `
      SELECT
        c.case_id,
        c.merchant_id,
        c.customer_id,
        c.payment_id,
        c.subscription_id,
        c.amount_at_risk::text,
        c.currency,
        c.failure_category,
        c.risk_score::text,
        c.recovery_probability::text,
        c.status,
        c.detected_at,
        c.resolved_at,
        c.recovered_amount::text,
        c.recovery_reason,
        c.created_at,
        c.updated_at,
        m.name AS merchant_name,
        cust.name AS customer_name,
        cust.email AS customer_email
      FROM revenue_risk_cases c
      LEFT JOIN merchants m ON c.merchant_id = m.merchant_id
      LEFT JOIN customers cust ON c.customer_id = cust.customer_id
      WHERE c.case_id = $1;
    `;

    const result = await pool.query<RiskCase>(query, [caseId]);
    if (result.rows.length === 0) {
      throw new NotFoundError(`Recovery case ${caseId}`);
    }

    return result.rows[0];
  }

  /**
   * Get audit logs for a specific recovery case.
   */
  public static async getCaseAuditLogs(caseId: string): Promise<AuditLog[]> {
    // Verify case exists first
    await this.getCaseById(caseId);

    const pool = getPool();
    const query = `
      SELECT
        log_id,
        entity_type,
        entity_id,
        action,
        actor_type,
        actor_id,
        before_state,
        after_state,
        metadata,
        ip_address::text,
        created_at
      FROM audit_logs
      WHERE entity_type = 'revenue_risk_cases' AND entity_id = $1
      ORDER BY created_at DESC;
    `;

    const result = await pool.query<AuditLog>(query, [caseId]);
    return result.rows;
  }
}
