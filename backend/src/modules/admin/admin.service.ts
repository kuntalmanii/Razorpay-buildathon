/**
 * modules/admin/admin.service.ts
 *
 * Core business logic and aggregation service for system administrators.
 * Provides system overviews, recovery monitoring, AI decision telemetry,
 * policy enforcement metrics, safe user management, and bounded audit logs.
 *
 * SECURITY:
 *  - Password hashes, tokens, API secrets, and internal keys are strictly stripped.
 *  - Audit queries are strictly bounded (max 100 per page).
 */

import { getPool } from '../../database/connection';

export interface AdminSystemOverview {
  totalUsers: number;
  totalRecoveryCases: number;
  activeRecoveryCases: number;
  totalRecoveredAmount: string;
  totalAtRiskAmount: string;
  blockedActions: number;
  failedActions: number;
  systemHealth: 'operational' | 'degraded' | 'warning';
}

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  activityCount: number;
}

export interface AdminRecoveryMonitoring {
  statusDistribution: Record<string, number>;
  categoryDistribution: Record<string, number>;
  blockedCases: Array<{
    caseId: string;
    customerName: string;
    amountAtRisk: string;
    failureCategory: string;
    status: string;
    detectedAt: string;
  }>;
  failedCases: Array<{
    caseId: string;
    customerName: string;
    amountAtRisk: string;
    failureCategory: string;
    detectedAt: string;
  }>;
  recentCriticalCases: Array<{
    caseId: string;
    customerName: string;
    amountAtRisk: string;
    riskScore: number;
    failureCategory: string;
    status: string;
    detectedAt: string;
  }>;
}

export interface AdminAiDecisionRecord {
  decisionId: string;
  caseId: string;
  modelProvider: string;
  modelName: string;
  decisionType: string;
  structuredOutput: Record<string, unknown>;
  confidence: number;
  latencyMs: number;
  createdAt: string;
}

export interface AdminPolicyMonitoring {
  rules: Array<{
    ruleId: string;
    name: string;
    description: string;
    actionType: string;
    conditions: Record<string, unknown>;
    constraints: Record<string, unknown>;
    priority: number;
    isActive: boolean;
    createdAt: string;
  }>;
  metrics: {
    totalRules: number;
    activeRules: number;
    totalEvaluations: number;
    totalApproved: number;
    totalBlocked: number;
    approvalRatePercent: number;
  };
  recentBlockedActions: Array<{
    actionId: string;
    caseId: string;
    actionType: string;
    proposedBy: string;
    policyStatus: string;
    policyReason: string | null;
    createdAt: string;
  }>;
}

export interface AdminAuditRecord {
  logId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorType: string;
  actorId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export class AdminService {
  /**
   * 1. System Overview: Aggregated real data across all entities
   */
  static async getOverview(): Promise<AdminSystemOverview> {
    const pool = getPool();
    const query = `
      SELECT
        (SELECT COUNT(*)::int FROM users) AS total_users,
        (SELECT COUNT(*)::int FROM revenue_risk_cases) AS total_cases,
        (SELECT COUNT(*)::int FROM revenue_risk_cases WHERE status IN ('open', 'in_progress')) AS active_cases,
        (SELECT COALESCE(SUM(recovered_amount), 0)::text FROM revenue_risk_cases) AS total_recovered,
        (SELECT COALESCE(SUM(amount_at_risk), 0)::text FROM revenue_risk_cases) AS total_at_risk,
        (SELECT COUNT(*)::int FROM recovery_actions WHERE policy_status = 'rejected') AS blocked_actions,
        (SELECT COUNT(*)::int FROM recovery_actions WHERE execution_status = 'failed') AS failed_actions
    `;

    const res = await pool.query<{
      total_users: number;
      total_cases: number;
      active_cases: number;
      total_recovered: string;
      total_at_risk: string;
      blocked_actions: number;
      failed_actions: number;
    }>(query);

    const row = res.rows[0] || {
      total_users: 0,
      total_cases: 0,
      active_cases: 0,
      total_recovered: '0',
      total_at_risk: '0',
      blocked_actions: 0,
      failed_actions: 0,
    };

    const failed = Number(row.failed_actions || 0);
    const health: 'operational' | 'degraded' | 'warning' =
      failed > 10 ? 'degraded' : failed > 0 ? 'warning' : 'operational';

    return {
      totalUsers: Number(row.total_users || 0),
      totalRecoveryCases: Number(row.total_cases || 0),
      activeRecoveryCases: Number(row.active_cases || 0),
      totalRecoveredAmount: row.total_recovered || '0',
      totalAtRiskAmount: row.total_at_risk || '0',
      blockedActions: Number(row.blocked_actions || 0),
      failedActions: failed,
      systemHealth: health,
    };
  }

  /**
   * 2. User Management: View users, roles, creation dates, and activity counts.
   * Strictly excludes password hashes and secret tokens.
   */
  static async getUsers(options: { role?: string; page?: number; limit?: number } = {}): Promise<{
    users: AdminUserRecord[];
    total: number;
  }> {
    const pool = getPool();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.role) {
      whereClauses.push(`u.role = $${paramIdx++}`);
      values.push(options.role);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listQuery = `
      SELECT u.user_id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at,
             COUNT(a.log_id)::int AS activity_count
      FROM users u
      LEFT JOIN audit_logs a ON (a.actor_id = u.email OR a.actor_id = u.user_id)
      ${whereSql}
      GROUP BY u.user_id, u.name, u.email, u.role, u.is_active, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM users u
      ${whereSql}
    `;

    const [listRes, countRes] = await Promise.all([
      pool.query<{
        user_id: string;
        name: string;
        email: string;
        role: 'user' | 'admin';
        is_active: boolean;
        created_at: string | Date;
        updated_at: string | Date;
        activity_count: number;
      }>(listQuery, [...values, limit, offset]),
      pool.query<{ total: number }>(countQuery, values),
    ]);

    const users: AdminUserRecord[] = listRes.rows.map((r) => ({
      id: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.is_active,
      createdAt: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
      updatedAt: typeof r.updated_at === 'string' ? r.updated_at : r.updated_at.toISOString(),
      activityCount: Number(r.activity_count || 0),
    }));

    return {
      users,
      total: countRes.rows[0]?.total ?? users.length,
    };
  }

  /**
   * 3. Recovery Monitoring: Status breakdown, failure breakdown, blocked cases, failed cases
   */
  static async getRecoveryMonitoring(): Promise<AdminRecoveryMonitoring> {
    const pool = getPool();

    const [statusRes, catRes, casesRes] = await Promise.all([
      pool.query<{ status: string; count: number }>(
        `SELECT status, COUNT(*)::int AS count FROM revenue_risk_cases GROUP BY status`
      ),
      pool.query<{ failure_category: string; count: number }>(
        `SELECT failure_category, COUNT(*)::int AS count FROM revenue_risk_cases GROUP BY failure_category`
      ),
      pool.query<{
        case_id: string;
        customer_name?: string;
        amount_at_risk: string;
        risk_score: string;
        failure_category: string;
        status: string;
        detected_at: string | Date;
      }>(
        `SELECT c.case_id, c.customer_id, c.amount_at_risk::text, c.risk_score::text,
                c.failure_category, c.status, c.detected_at, cust.name AS customer_name
         FROM revenue_risk_cases c
         LEFT JOIN customers cust ON c.customer_id = cust.customer_id
         ORDER BY c.detected_at DESC`
      ),
    ]);

    const statusDistribution: Record<string, number> = {};
    for (const r of statusRes.rows) {
      statusDistribution[r.status] = Number(r.count);
    }

    const categoryDistribution: Record<string, number> = {};
    for (const r of catRes.rows) {
      categoryDistribution[r.failure_category] = Number(r.count);
    }

    const allCases = casesRes.rows;

    const blockedCases = allCases
      .filter((c) => c.status === 'escalated')
      .map((c) => ({
        caseId: c.case_id,
        customerName: c.customer_name || 'Guest / Merchant Customer',
        amountAtRisk: c.amount_at_risk,
        failureCategory: c.failure_category,
        status: c.status,
        detectedAt: typeof c.detected_at === 'string' ? c.detected_at : c.detected_at.toISOString(),
      }));

    const failedCases = allCases
      .filter((c) => c.status === 'unrecoverable')
      .map((c) => ({
        caseId: c.case_id,
        customerName: c.customer_name || 'Guest / Merchant Customer',
        amountAtRisk: c.amount_at_risk,
        failureCategory: c.failure_category,
        detectedAt: typeof c.detected_at === 'string' ? c.detected_at : c.detected_at.toISOString(),
      }));

    const recentCriticalCases = allCases
      .filter((c) => Number(c.risk_score || 0) >= 70 || BigInt(c.amount_at_risk || '0') >= 500000n)
      .slice(0, 10)
      .map((c) => ({
        caseId: c.case_id,
        customerName: c.customer_name || 'Guest / Merchant Customer',
        amountAtRisk: c.amount_at_risk,
        riskScore: Number(c.risk_score || 0),
        failureCategory: c.failure_category,
        status: c.status,
        detectedAt: typeof c.detected_at === 'string' ? c.detected_at : c.detected_at.toISOString(),
      }));

    return {
      statusDistribution,
      categoryDistribution,
      blockedCases,
      failedCases,
      recentCriticalCases,
    };
  }

  /**
   * 4. AI Decision Monitoring: Inspect existing AI decisions and outcomes.
   * Sanitizes all structured outputs to prevent any internal credential leakage.
   */
  static async getAiDecisions(options: { page?: number; limit?: number } = {}): Promise<{
    decisions: AdminAiDecisionRecord[];
    total: number;
  }> {
    const pool = getPool();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const [listRes, countRes] = await Promise.all([
      pool.query<{
        decision_id: string;
        case_id: string;
        model_provider: string;
        model_name: string;
        decision_type: string;
        structured_output: Record<string, unknown>;
        confidence: number;
        latency_ms: number;
        created_at: string | Date;
      }>(
        `SELECT decision_id, case_id, model_provider, model_name, decision_type,
                structured_output, confidence, latency_ms, created_at
         FROM ai_decisions
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query<{ total: number }>(`SELECT COUNT(*)::int AS total FROM ai_decisions`),
    ]);

    const sanitizeOutput = (out: Record<string, unknown> = {}) => {
      const sanitized = { ...out };
      delete sanitized.api_key;
      delete sanitized.secret;
      delete sanitized.token;
      return sanitized;
    };

    const decisions: AdminAiDecisionRecord[] = listRes.rows.map((r) => ({
      decisionId: r.decision_id,
      caseId: r.case_id,
      modelProvider: r.model_provider,
      modelName: r.model_name,
      decisionType: r.decision_type,
      structuredOutput: sanitizeOutput(r.structured_output),
      confidence: Number(r.confidence || 0),
      latencyMs: Number(r.latency_ms || 0),
      createdAt: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
    }));

    return {
      decisions,
      total: countRes.rows[0]?.total ?? decisions.length,
    };
  }

  /**
   * 5. Policy Monitoring: Inspect policy rules, evaluations, and blocks.
   */
  static async getPolicies(): Promise<AdminPolicyMonitoring> {
    const pool = getPool();

    const [rulesRes, actionsRes] = await Promise.all([
      pool.query<{
        rule_id: string;
        name: string;
        description: string;
        action_type: string;
        conditions: Record<string, unknown>;
        constraints: Record<string, unknown>;
        priority: number;
        is_active: boolean;
        created_at: string | Date;
      }>(
        `SELECT rule_id, name, description, action_type, conditions, constraints,
                priority, is_active, created_at
         FROM policy_rules
         ORDER BY priority DESC, created_at DESC`
      ),
      pool.query<{
        action_id: string;
        case_id: string;
        action_type: string;
        proposed_by: string;
        policy_status: string;
        result: Record<string, unknown>;
        created_at: string | Date;
      }>(
        `SELECT action_id, case_id, action_type, proposed_by, policy_status, result, created_at
         FROM recovery_actions
         ORDER BY created_at DESC`
      ),
    ]);

    const rules = rulesRes.rows.map((r) => ({
      ruleId: r.rule_id,
      name: r.name,
      description: r.description,
      actionType: r.action_type,
      conditions: r.conditions || {},
      constraints: r.constraints || {},
      priority: r.priority,
      isActive: r.is_active,
      createdAt: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
    }));

    const actions = actionsRes.rows;
    const totalEvaluations = actions.length;
    const totalApproved = actions.filter((a) => a.policy_status === 'approved').length;
    const totalBlocked = actions.filter((a) => a.policy_status === 'rejected').length;
    const approvalRate =
      totalEvaluations > 0 ? Math.round((totalApproved / totalEvaluations) * 100) : 100;

    const recentBlockedActions = actions
      .filter((a) => a.policy_status === 'rejected')
      .slice(0, 10)
      .map((a) => ({
        actionId: a.action_id,
        caseId: a.case_id,
        actionType: a.action_type,
        proposedBy: a.proposed_by,
        policyStatus: a.policy_status,
        policyReason: (a.result?.policy_violation as string) || 'Safety rule triggered',
        createdAt: typeof a.created_at === 'string' ? a.created_at : a.created_at.toISOString(),
      }));

    return {
      rules,
      metrics: {
        totalRules: rules.length,
        activeRules: rules.filter((r) => r.isActive).length,
        totalEvaluations,
        totalApproved,
        totalBlocked,
        approvalRatePercent: approvalRate,
      },
      recentBlockedActions,
    };
  }

  /**
   * 6. Audit Monitoring: Filterable audit trail with safe bounded pagination (strictly <= 100).
   * Strips any sensitive credentials from snapshots.
   */
  static async getAuditLogs(options: {
    page?: number;
    limit?: number;
    entityType?: string;
    actorType?: string;
    action?: string;
  } = {}): Promise<{
    logs: AdminAuditRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const pool = getPool();
    const page = Math.max(1, options.page || 1);
    // Strict safety clamp: never load > 100 records
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (options.entityType) {
      whereClauses.push(`entity_type = $${paramIdx++}`);
      values.push(options.entityType);
    }
    if (options.actorType) {
      whereClauses.push(`actor_type = $${paramIdx++}`);
      values.push(options.actorType);
    }
    if (options.action) {
      whereClauses.push(`action ILIKE $${paramIdx++}`);
      values.push(`%${options.action}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listQuery = `
      SELECT log_id, entity_type, entity_id, action, actor_type, actor_id,
             before_state, after_state, metadata, ip_address, created_at
      FROM audit_logs
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM audit_logs
      ${whereSql}
    `;

    const [listRes, countRes] = await Promise.all([
      pool.query<{
        log_id: string;
        entity_type: string;
        entity_id: string;
        action: string;
        actor_type: string;
        actor_id: string | null;
        before_state: Record<string, unknown> | null;
        after_state: Record<string, unknown> | null;
        metadata: Record<string, unknown> | null;
        ip_address: string | null;
        created_at: string | Date;
      }>(listQuery, [...values, limit, offset]),
      pool.query<{ total: number }>(countQuery, values),
    ]);

    const sanitizeState = (s: Record<string, unknown> | null) => {
      if (!s) return null;
      const clean = { ...s };
      delete clean.password;
      delete clean.password_hash;
      delete clean.secret;
      delete clean.token;
      delete clean.key;
      return clean;
    };

    const logs: AdminAuditRecord[] = listRes.rows.map((r) => ({
      logId: r.log_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      actorType: r.actor_type,
      actorId: r.actor_id,
      beforeState: sanitizeState(r.before_state),
      afterState: sanitizeState(r.after_state),
      metadata: sanitizeState(r.metadata),
      ipAddress: r.ip_address,
      createdAt: typeof r.created_at === 'string' ? r.created_at : r.created_at.toISOString(),
    }));

    const total = countRes.rows[0]?.total ?? logs.length;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}
