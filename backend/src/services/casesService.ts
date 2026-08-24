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

  /**
   * Create a new revenue risk case manually.
   */
  public static async createCase(payload: {
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
    payment_id?: string;
    subscription_id?: string;
    amount_at_risk: number;
    currency?: string;
    failure_category: string;
    risk_score: number;
    recovery_probability?: number;
    recovery_reason?: string;
  }): Promise<RiskCase> {
    const pool = getPool();
    const caseId = `case_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const merchantId = 'MID_DEV_001';
    const now = new Date().toISOString();

    const insertQuery = `
      INSERT INTO revenue_risk_cases (
        case_id, merchant_id, customer_id, payment_id, subscription_id,
        amount_at_risk, currency, failure_category, risk_score,
        recovery_probability, status, detected_at, recovery_reason,
        customer_name, customer_email
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *;
    `;

    await pool.query(insertQuery, [
      caseId,
      merchantId,
      payload.customer_id || null,
      payload.payment_id || null,
      payload.subscription_id || null,
      payload.amount_at_risk,
      payload.currency || 'INR',
      payload.failure_category,
      payload.risk_score,
      payload.recovery_probability ?? 0.5,
      'open',
      now,
      payload.recovery_reason || null,
      payload.customer_name || null,
      payload.customer_email || null,
    ]);

    // Write immutable audit log entry
    const logId = `log_create_${Date.now()}`;
    await pool.query(
      `INSERT INTO audit_logs (log_id, entity_type, entity_id, action, actor_type, actor_id, before_state, after_state, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        logId,
        'revenue_risk_cases',
        caseId,
        'case_created',
        'human',
        null,
        null,
        { case_id: caseId, failure_category: payload.failure_category, amount_at_risk: payload.amount_at_risk, status: 'open' },
        { source: 'manual_create', timestamp: now },
      ]
    );

    return this.getCaseById(caseId);
  }

  /**
   * Update mutable fields of an existing recovery case.
   */
  public static async updateCase(
    caseId: string,
    payload: {
      status?: string;
      risk_score?: number;
      recovery_probability?: number;
      recovery_reason?: string | null;
      recovered_amount?: number | null;
      resolved_at?: string | null;
      customer_name?: string;
      customer_email?: string;
    }
  ): Promise<RiskCase> {
    // Capture before state for audit
    const before = await this.getCaseById(caseId);

    const pool = getPool();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let pi = 1;

    if (payload.status !== undefined) { setClauses.push(`status = $${pi++}`); values.push(payload.status); }
    if (payload.risk_score !== undefined) { setClauses.push(`risk_score = $${pi++}`); values.push(payload.risk_score); }
    if (payload.recovery_probability !== undefined) { setClauses.push(`recovery_probability = $${pi++}`); values.push(payload.recovery_probability); }
    if ('recovery_reason' in payload) { setClauses.push(`recovery_reason = $${pi++}`); values.push(payload.recovery_reason); }
    if ('recovered_amount' in payload) { setClauses.push(`recovered_amount = $${pi++}`); values.push(payload.recovered_amount); }
    if ('resolved_at' in payload) { setClauses.push(`resolved_at = $${pi++}`); values.push(payload.resolved_at); }
    if (payload.customer_name !== undefined) { setClauses.push(`customer_name = $${pi++}`); values.push(payload.customer_name); }
    if (payload.customer_email !== undefined) { setClauses.push(`customer_email = $${pi++}`); values.push(payload.customer_email); }

    if (setClauses.length === 0) {
      return before;
    }

    values.push(caseId);
    const updateQuery = `UPDATE revenue_risk_cases SET ${setClauses.join(', ')}, updated_at = NOW() WHERE case_id = $${pi}`;
    await pool.query(updateQuery, values);

    const after = await this.getCaseById(caseId);

    // Write immutable audit log entry
    const logId = `log_update_${Date.now()}`;
    await pool.query(
      `INSERT INTO audit_logs (log_id, entity_type, entity_id, action, actor_type, actor_id, before_state, after_state, metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        logId,
        'revenue_risk_cases',
        caseId,
        'case_updated',
        'human',
        null,
        { status: before.status, risk_score: before.risk_score, recovery_reason: before.recovery_reason },
        { status: after.status, risk_score: after.risk_score, recovery_reason: after.recovery_reason },
        { source: 'manual_update', fields_changed: Object.keys(payload), timestamp: new Date().toISOString() },
      ]
    );

    return after;
  }
}

