/**
 * database/devMemoryStore.ts
 *
 * Lightweight, zero-dependency in-memory PostgreSQL emulator for local development
 * and demonstration mode when a local PostgreSQL daemon is not running.
 *
 * Automatically initialized with realistic Razorpay recovery scenarios,
 * customer cases, AI advisory proposals, deterministic policy logs, and audit entries.
 */

export interface DevCase {
  case_id: string;
  merchant_id: string;
  customer_id: string;
  payment_id: string | null;
  subscription_id: string | null;
  amount_at_risk: string;
  currency: string;
  failure_category: string;
  risk_score: string;
  recovery_probability: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  recovered_amount: string | null;
  recovery_reason: string | null;
  created_at: string;
  updated_at: string;
  merchant_name?: string;
  customer_name?: string;
  customer_email?: string;
}

export interface DevAction {
  action_id: string;
  case_id: string;
  action_type: string;
  proposed_by: string;
  policy_status: string;
  execution_status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  created_at: string;
  executed_at: string | null;
}

export interface DevAuditLog {
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
  created_at: string;
}

export interface DevWebhookEvent {
  event_id: string;
  razorpay_event_id: string;
  event_type: string;
  signature_verified: boolean;
  processing_status: string;
  payload: Record<string, unknown>;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
}

class DevMemoryStore {
  public cases: DevCase[] = [
    {
      case_id: 'case_dev_001',
      merchant_id: 'MID_DEV_001',
      customer_id: 'cust_dev_001',
      payment_id: 'pay_dev_002',
      subscription_id: null,
      amount_at_risk: '500000',
      currency: 'INR',
      failure_category: 'insufficient_funds',
      risk_score: '35',
      recovery_probability: '0.88',
      status: 'recovered',
      detected_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      resolved_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      recovered_amount: '500000',
      recovery_reason: 'Payment Link recovered via UPI WhatsApp nudge',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      merchant_name: 'Acme Enterprise India',
      customer_name: 'Rohit Sharma',
      customer_email: 'rohit.sharma@example.dev',
    },
    {
      case_id: 'case_dev_002',
      merchant_id: 'MID_DEV_001',
      customer_id: 'cust_dev_002',
      payment_id: 'pay_dev_003',
      subscription_id: null,
      amount_at_risk: '150000',
      currency: 'INR',
      failure_category: 'network_error',
      risk_score: '45',
      recovery_probability: '0.92',
      status: 'in_progress',
      detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      resolved_at: null,
      recovered_amount: null,
      recovery_reason: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      merchant_name: 'Acme Enterprise India',
      customer_name: 'Priya Mehta',
      customer_email: 'priya.mehta@example.dev',
    },
    {
      case_id: 'case_dev_003',
      merchant_id: 'MID_DEV_001',
      customer_id: 'cust_dev_003',
      payment_id: null,
      subscription_id: 'sub_dev_002',
      amount_at_risk: '999900',
      currency: 'INR',
      failure_category: 'subscription_halt',
      risk_score: '82',
      recovery_probability: '0.65',
      status: 'open',
      detected_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      resolved_at: null,
      recovered_amount: null,
      recovery_reason: null,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      merchant_name: 'Acme Enterprise India',
      customer_name: 'Arjun Kapoor',
      customer_email: 'arjun.kapoor@example.dev',
    },
    {
      case_id: 'case_dev_004',
      merchant_id: 'MID_DEV_001',
      customer_id: 'cust_dev_004',
      payment_id: 'pay_dev_004',
      subscription_id: null,
      amount_at_risk: '750000',
      currency: 'INR',
      failure_category: 'bank_decline',
      risk_score: '68',
      recovery_probability: '0.74',
      status: 'recovered',
      detected_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      resolved_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      recovered_amount: '750000',
      recovery_reason: 'Automated 24h cooldown retry succeeded',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      merchant_name: 'Acme Enterprise India',
      customer_name: 'Sneha Patel',
      customer_email: 'sneha.patel@example.dev',
    },
    {
      case_id: 'case_dev_005',
      merchant_id: 'MID_DEV_001',
      customer_id: 'cust_dev_005',
      payment_id: 'pay_dev_005',
      subscription_id: null,
      amount_at_risk: '320000',
      currency: 'INR',
      failure_category: 'card_expired',
      risk_score: '55',
      recovery_probability: '0.80',
      status: 'in_progress',
      detected_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      resolved_at: null,
      recovered_amount: null,
      recovery_reason: null,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
      merchant_name: 'Acme Enterprise India',
      customer_name: 'Vikram Sengupta',
      customer_email: 'vikram.s@example.dev',
    },
  ];

  public actions: DevAction[] = [
    {
      action_id: 'act_dev_001',
      case_id: 'case_dev_001',
      action_type: 'create_payment_link',
      proposed_by: 'ai',
      policy_status: 'approved',
      execution_status: 'completed',
      payload: {
        decision: 'PAYMENT_LINK',
        channel: 'whatsapp_sms',
        confidence: 0.88,
        reasoning: 'Insufficient funds on recurring mandate. Instant zero-friction payment link dispatched via WhatsApp.',
      },
      result: {
        razorpay_payment_link_id: 'plink_dev_001',
        short_url: 'https://rzp.io/i/recov001',
        status: 'paid',
      },
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      executed_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      action_id: 'act_dev_002',
      case_id: 'case_dev_002',
      action_type: 'schedule_retry',
      proposed_by: 'ai',
      policy_status: 'approved',
      execution_status: 'completed',
      payload: {
        decision: 'SCHEDULE_RETRY',
        cooldown_hours: 4,
        confidence: 0.92,
        reasoning: 'Transient bank network timeout. Scheduled immediate retry after 4-hour banking window stabilization.',
      },
      result: {
        scheduled_for: new Date(Date.now() + 3600000 * 2).toISOString(),
      },
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      executed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      action_id: 'act_dev_003',
      case_id: 'case_dev_003',
      action_type: 'retry_payment',
      proposed_by: 'ai',
      policy_status: 'rejected',
      execution_status: 'failed',
      payload: {
        decision: 'RETRY',
        confidence: 0.65,
        reasoning: 'Attempt third consecutive retry on halted mandate.',
      },
      result: {
        policy_violation: 'Max 2 retries exceeded for subscription mandate.',
      },
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      executed_at: null,
    },
    {
      action_id: 'act_dev_004',
      case_id: 'case_dev_004',
      action_type: 'schedule_retry',
      proposed_by: 'ai',
      policy_status: 'approved',
      execution_status: 'completed',
      payload: {
        decision: 'SCHEDULE_RETRY',
        cooldown_hours: 24,
        confidence: 0.74,
        reasoning: 'Bank decline with high loyalty score. Enforced 24h bank cycle cooldown.',
      },
      result: {
        razorpay_payment_id: 'pay_dev_recovered_004',
        status: 'captured',
      },
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      executed_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
  ];

  public auditLogs: DevAuditLog[] = [
    {
      log_id: 'log_dev_001',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_001',
      action: 'PAYMENT_SETTLED',
      actor_type: 'webhook',
      actor_id: 'razorpay_webhook_worker',
      before_state: { status: 'in_progress' },
      after_state: { status: 'recovered', recovered_amount: '500000' },
      metadata: { razorpay_event: 'payment_link.paid', amount: 500000 },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    {
      log_id: 'log_dev_002',
      entity_type: 'recovery_actions',
      entity_id: 'act_dev_001',
      action: 'ACTION_DISPATCHED',
      actor_type: 'worker',
      actor_id: 'recovery_execution_worker',
      before_state: { execution_status: 'pending' },
      after_state: { execution_status: 'completed' },
      metadata: { action_type: 'create_payment_link', channel: 'whatsapp_sms' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      log_id: 'log_dev_003',
      entity_type: 'recovery_actions',
      entity_id: 'act_dev_001',
      action: 'POLICY_VALIDATED',
      actor_type: 'system',
      actor_id: 'policy_engine',
      before_state: null,
      after_state: { policy_status: 'approved' },
      metadata: { rule: 'Global: Send payment reminder notification', passed: true },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      log_id: 'log_dev_004',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_001',
      action: 'AI_REASONING_PROPOSED',
      actor_type: 'ai',
      actor_id: 'gemini-1.5-pro',
      before_state: null,
      after_state: { decision: 'PAYMENT_LINK', confidence: 0.88 },
      metadata: { reasoning: 'Insufficient funds on recurring mandate. Dispatched instant WhatsApp link.' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      log_id: 'log_dev_005',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_001',
      action: 'FAILURE_INGESTED',
      actor_type: 'webhook',
      actor_id: 'razorpay_webhook_ingress',
      before_state: null,
      after_state: { status: 'open', risk_score: 35 },
      metadata: { event: 'payment.failed', failure_category: 'insufficient_funds' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      log_id: 'log_dev_006',
      entity_type: 'recovery_actions',
      entity_id: 'act_dev_003',
      action: 'POLICY_BLOCKED',
      actor_type: 'system',
      actor_id: 'policy_engine',
      before_state: { policy_status: 'pending' },
      after_state: { policy_status: 'rejected' },
      metadata: { rule: 'Max 2 retries enforced', violation: 'Retry limit reached' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      log_id: 'log_dev_007',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_002',
      action: 'ACTION_SCHEDULED',
      actor_type: 'worker',
      actor_id: 'retry_scheduler',
      before_state: { status: 'open' },
      after_state: { status: 'in_progress' },
      metadata: { action_type: 'schedule_retry', delay_hours: 4 },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      log_id: 'log_dev_008',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_003',
      action: 'POLICY_BLOCKED',
      actor_type: 'system',
      actor_id: 'policy_engine',
      before_state: { status: 'open' },
      after_state: { status: 'escalated' },
      metadata: { reason: 'Card expired. Automated retry blocked by policy gate.' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      log_id: 'log_dev_009',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_004',
      action: 'PAYMENT_SETTLED',
      actor_type: 'webhook',
      actor_id: 'razorpay_webhook_worker',
      before_state: { status: 'in_progress' },
      after_state: { status: 'recovered', recovered_amount: '750000' },
      metadata: { razorpay_event: 'payment.captured', amount: 750000 },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    },
    {
      log_id: 'log_dev_010',
      entity_type: 'revenue_risk_cases',
      entity_id: 'case_dev_005',
      action: 'FAILURE_INGESTED',
      actor_type: 'webhook',
      actor_id: 'razorpay_webhook_ingress',
      before_state: null,
      after_state: { status: 'in_progress', risk_score: 55 },
      metadata: { event: 'subscription.halted', failure_category: 'subscription_halt' },
      ip_address: '127.0.0.1',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  public webhookEvents: DevWebhookEvent[] = [
    {
      event_id: 'evt_dev_001',
      razorpay_event_id: 'evt_rzp_9901',
      event_type: 'payment.failed',
      signature_verified: true,
      processing_status: 'processed',
      payload: { payment_id: 'pay_dev_002', error_code: 'BAD_REQUEST_ERROR' },
      error_message: null,
      received_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      processed_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      event_id: 'evt_dev_002',
      razorpay_event_id: 'evt_rzp_9902',
      event_type: 'payment_link.paid',
      signature_verified: true,
      processing_status: 'processed',
      payload: { payment_link_id: 'plink_dev_001', amount: 500000 },
      error_message: null,
      received_at: new Date(Date.now() - 3600000 * 1).toISOString(),
      processed_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
  ];

  public query(sql: string, params: unknown[] = []): { rows: unknown[]; rowCount: number } {
    const trimmed = sql.trim();

    // 1. SELECT 1 Health Check
    if (trimmed.startsWith('SELECT 1')) {
      return { rows: [{ '?column?': 1 }], rowCount: 1 };
    }

    // 2. Dashboard Status Aggregate Query
    if (trimmed.includes('FROM revenue_risk_cases') && trimmed.includes('GROUP BY status')) {
      const counts: Record<string, number> = {};
      for (const c of this.cases) {
        counts[c.status] = (counts[c.status] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([status, count]) => ({ status, count }));
      return { rows, rowCount: rows.length };
    }

    // 3. Dashboard Financial Aggregate Query
    if (trimmed.includes('COALESCE(SUM(amount_at_risk)') || trimmed.includes('SUM(amount_at_risk)')) {
      let atRisk = 0n;
      let recovered = 0n;
      for (const c of this.cases) {
        atRisk += BigInt(c.amount_at_risk || '0');
        if (c.recovered_amount) {
          recovered += BigInt(c.recovered_amount);
        }
      }
      return {
        rows: [{ total_at_risk: atRisk.toString(), total_recovered: recovered.toString() }],
        rowCount: 1,
      };
    }

    // 4. Evaluation Cases Aggregate Query
    if (trimmed.includes('total_cases') && trimmed.includes('recovered_cases')) {
      let total = 0;
      let recovered = 0;
      let open = 0;
      let escalated = 0;
      let totalRisk = 0n;
      let totalRecovered = 0n;
      for (const c of this.cases) {
        total += 1;
        totalRisk += BigInt(c.amount_at_risk || '0');
        if (c.status === 'recovered') {
          recovered += 1;
          if (c.recovered_amount) {
            totalRecovered += BigInt(c.recovered_amount);
          }
        } else if (c.status === 'open' || c.status === 'in_progress') {
          open += 1;
        } else if (c.status === 'escalated') {
          escalated += 1;
        }
      }
      const avgRecovered = recovered > 0 ? (totalRecovered / BigInt(recovered)).toString() : '250000';
      return {
        rows: [{
          total_cases: total,
          recovered_cases: recovered,
          open_cases: open,
          escalated_cases: escalated,
          total_risk_paise: totalRisk.toString(),
          total_recovered_paise: totalRecovered.toString(),
          avg_recovered_paise: avgRecovered,
        }],
        rowCount: 1,
      };
    }

    // 5. Evaluation Policy & Idempotency Audit Logs Aggregate
    if (trimmed.includes('policy_blocks') && trimmed.includes('idempotent_blocks')) {
      let policyBlocks = 0;
      let idempotentBlocks = 0;
      let webhookDuplicates = 0;
      let timeoutGuards = 0;
      for (const l of this.auditLogs) {
        const act = (l.action || '').toLowerCase();
        if (act.includes('policy_block') || act.includes('action_rejected') || act.includes('policy_blocked')) {
          policyBlocks += 1;
        }
        if (act.includes('idempotency') || act.includes('duplicate_prevented')) {
          idempotentBlocks += 1;
        }
        if (l.entity_type === 'webhook_events' && act.includes('duplicate')) {
          webhookDuplicates += 1;
        }
        if (act.includes('verification') || act.includes('timeout')) {
          timeoutGuards += 1;
        }
      }
      return {
        rows: [{
          policy_blocks: policyBlocks,
          idempotent_blocks: idempotentBlocks,
          webhook_duplicates: webhookDuplicates,
          timeout_guards: timeoutGuards,
        }],
        rowCount: 1,
      };
    }

    // 6. Evaluation Actions Aggregate
    if (trimmed.includes('retries_count') && trimmed.includes('total_actions')) {
      let total = 0;
      let retries = 0;
      let failed = 0;
      for (const a of this.actions) {
        total += 1;
        if (a.action_type === 'retry_payment' || a.action_type === 'schedule_retry') {
          retries += 1;
        }
        if (a.execution_status === 'failed') {
          failed += 1;
        }
      }
      return {
        rows: [{
          total_actions: total,
          retries_count: retries,
          failed_actions: failed,
        }],
        rowCount: 1,
      };
    }

    // 7. Group By Failure Category (Category Breakdown Chart)
    if (trimmed.includes('GROUP BY failure_category')) {
      const stats: Record<string, { total: number; recovered: number; count: number }> = {};
      for (const c of this.cases) {
        if (!stats[c.failure_category]) {
          stats[c.failure_category] = { total: 0, recovered: 0, count: 0 };
        }
        stats[c.failure_category].total += 1;
        stats[c.failure_category].count += 1;
        if (c.status === 'recovered') {
          stats[c.failure_category].recovered += 1;
        }
      }
      const rows = Object.entries(stats).map(([failure_category, s]) => ({
        failure_category,
        total: s.total,
        count: s.count,
        recovered: s.recovered,
      }));
      return { rows, rowCount: rows.length };
    }

    // 8. Cases Count Query
    if (trimmed.includes('SELECT COUNT(*)::int AS total') && trimmed.includes('FROM revenue_risk_cases')) {
      let filtered = [...this.cases];
      const statusParam = params.find((p) => typeof p === 'string' && ['open', 'in_progress', 'recovered', 'escalated', 'unrecoverable'].includes(p as string));
      if (statusParam) {
        filtered = filtered.filter((c) => c.status === statusParam);
      }
      return { rows: [{ total: filtered.length }], rowCount: 1 };
    }

    // 9. Single Case By ID
    if (trimmed.includes('FROM revenue_risk_cases') && trimmed.includes('c.case_id = $1')) {
      const id = params[0] as string;
      const found = this.cases.find((c) => c.case_id === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 10. Cases List Query
    if (trimmed.includes('FROM revenue_risk_cases')) {
      let filtered = [...this.cases];
      const statusParam = params.find((p) => typeof p === 'string' && ['open', 'in_progress', 'recovered', 'escalated', 'unrecoverable'].includes(p as string));
      if (statusParam) {
        filtered = filtered.filter((c) => c.status === statusParam);
      }

      // Check for limit/offset in params
      const limit = Number(params[params.length - 2]) || 50;
      const offset = Number(params[params.length - 1]) || 0;
      const sliced = filtered.slice(offset, offset + limit);
      return { rows: sliced, rowCount: sliced.length };
    }

    // 7. Recovery Actions By Case ID
    if (trimmed.includes('FROM recovery_actions') && trimmed.includes('case_id = $1')) {
      const caseId = params[0] as string;
      const found = this.actions.filter((a) => a.case_id === caseId);
      return { rows: found, rowCount: found.length };
    }

    // 8. Recovery Actions List
    if (trimmed.includes('FROM recovery_actions')) {
      if (trimmed.includes('COUNT(*)::int')) {
        return { rows: [{ total: this.actions.length }], rowCount: 1 };
      }
      return { rows: this.actions, rowCount: this.actions.length };
    }

    // 9. Audit Logs
    if (trimmed.includes('FROM audit_logs')) {
      if (trimmed.includes('COUNT(*)::int')) {
        return { rows: [{ total: this.auditLogs.length }], rowCount: 1 };
      }
      if (trimmed.includes('entity_id = $1') || trimmed.includes('entity_id =')) {
        const entityId = params[0] as string;
        const found = entityId ? this.auditLogs.filter((l) => l.entity_id === entityId) : this.auditLogs;
        return { rows: found, rowCount: found.length };
      }
      return { rows: this.auditLogs, rowCount: this.auditLogs.length };
    }

    // 10. Webhook Events
    if (trimmed.includes('FROM webhook_events')) {
      if (trimmed.includes('COUNT(*)::int') && trimmed.includes('GROUP BY processing_status')) {
        const counts: Record<string, number> = {};
        for (const w of this.webhookEvents) {
          counts[w.processing_status] = (counts[w.processing_status] || 0) + 1;
        }
        const rows = Object.entries(counts).map(([processing_status, count]) => ({ processing_status, count }));
        return { rows, rowCount: rows.length };
      }
      if (trimmed.includes('COUNT(*)::int')) {
        return { rows: [{ total: this.webhookEvents.length }], rowCount: 1 };
      }
      return { rows: this.webhookEvents, rowCount: this.webhookEvents.length };
    }

    // 11. Metrics: Failure Categories
    if (trimmed.includes('GROUP BY failure_category')) {
      const counts: Record<string, number> = {};
      for (const c of this.cases) {
        counts[c.failure_category] = (counts[c.failure_category] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([failure_category, count]) => ({ failure_category, count }));
      return { rows, rowCount: rows.length };
    }

    // 12. Metrics: Actions By Type
    if (trimmed.includes('GROUP BY action_type')) {
      const counts: Record<string, number> = {};
      for (const a of this.actions) {
        counts[a.action_type] = (counts[a.action_type] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([action_type, count]) => ({ action_type, count }));
      return { rows, rowCount: rows.length };
    }

    // 13. Metrics: Actions By Execution Status
    if (trimmed.includes('GROUP BY execution_status')) {
      const counts: Record<string, number> = {};
      for (const a of this.actions) {
        counts[a.execution_status] = (counts[a.execution_status] || 0) + 1;
      }
      const rows = Object.entries(counts).map(([execution_status, count]) => ({ execution_status, count }));
      return { rows, rowCount: rows.length };
    }

    // WRITE PATHS

    // W1. INSERT INTO revenue_risk_cases
    if (trimmed.startsWith('INSERT INTO revenue_risk_cases')) {
      const newCase: DevCase = {
        case_id: params[0] as string,
        merchant_id: params[1] as string,
        customer_id: (params[2] as string) || 'cust_manual',
        payment_id: (params[3] as string) || null,
        subscription_id: (params[4] as string) || null,
        amount_at_risk: String(params[5] || '0'),
        currency: (params[6] as string) || 'INR',
        failure_category: (params[7] as string) || 'unknown',
        risk_score: String(params[8] || '50'),
        recovery_probability: String(params[9] || '0.5'),
        status: (params[10] as string) || 'open',
        detected_at: (params[11] as string) || new Date().toISOString(),
        resolved_at: null,
        recovered_amount: null,
        recovery_reason: (params[12] as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        merchant_name: 'Acme Enterprise India',
        customer_name: (params[13] as string) || undefined,
        customer_email: (params[14] as string) || undefined,
      };
      this.cases.push(newCase);
      return { rows: [newCase], rowCount: 1 };
    }

    // W2. UPDATE revenue_risk_cases SET ... WHERE case_id = $N
    if (trimmed.startsWith('UPDATE revenue_risk_cases')) {
      const caseId = params[params.length - 1] as string;
      const idx = this.cases.findIndex((c) => c.case_id === caseId);
      if (idx === -1) return { rows: [], rowCount: 0 };

      const before = { ...this.cases[idx] };
      // Apply param updates in order: status, risk_score, recovery_probability,
      // recovery_reason, recovered_amount, resolved_at, customer_name, customer_email
      let pi = 0;
      if (trimmed.includes('status =')) this.cases[idx].status = (params[pi++] as string) || this.cases[idx].status;
      if (trimmed.includes('risk_score =')) this.cases[idx].risk_score = String(params[pi++] || this.cases[idx].risk_score);
      if (trimmed.includes('recovery_probability =')) this.cases[idx].recovery_probability = String(params[pi++] || this.cases[idx].recovery_probability);
      if (trimmed.includes('recovery_reason =')) this.cases[idx].recovery_reason = (params[pi++] as string | null) ?? this.cases[idx].recovery_reason;
      if (trimmed.includes('recovered_amount =')) this.cases[idx].recovered_amount = (params[pi++] as string | null) ?? this.cases[idx].recovered_amount;
      if (trimmed.includes('resolved_at =')) this.cases[idx].resolved_at = (params[pi++] as string | null) ?? this.cases[idx].resolved_at;
      if (trimmed.includes('customer_name =')) this.cases[idx].customer_name = (params[pi++] as string | undefined) ?? this.cases[idx].customer_name;
      if (trimmed.includes('customer_email =')) this.cases[idx].customer_email = (params[pi++] as string | undefined) ?? this.cases[idx].customer_email;
      this.cases[idx].updated_at = new Date().toISOString();

      return { rows: [{ ...this.cases[idx], _before: before }], rowCount: 1 };
    }

    // W3. INSERT INTO audit_logs
    if (trimmed.startsWith('INSERT INTO audit_logs')) {
      const newLog: DevAuditLog = {
        log_id: (params[0] as string) || `log_${Date.now()}`,
        entity_type: (params[1] as string) || 'revenue_risk_cases',
        entity_id: (params[2] as string) || '',
        action: (params[3] as string) || 'case_updated',
        actor_type: (params[4] as string) || 'system',
        actor_id: (params[5] as string | null) || null,
        before_state: (params[6] as Record<string, unknown> | null) || null,
        after_state: (params[7] as Record<string, unknown> | null) || null,
        metadata: (params[8] as Record<string, unknown> | null) || null,
        ip_address: null,
        created_at: new Date().toISOString(),
      };
      this.auditLogs.unshift(newLog); // prepend so it appears first in recent list
      return { rows: [newLog], rowCount: 1 };
    }

    // Fallback: return empty rows
    return { rows: [], rowCount: 0 };
  }
}

export const devMemoryStore = new DevMemoryStore();
