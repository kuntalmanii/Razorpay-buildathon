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
      failure_category: 'network_failure',
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
      failure_category: 'subscription_halted',
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

    // 4. Cases Count Query
    if (trimmed.includes('SELECT COUNT(*)::int AS total') && trimmed.includes('FROM revenue_risk_cases')) {
      let filtered = [...this.cases];
      const statusParam = params.find((p) => typeof p === 'string' && ['open', 'in_progress', 'recovered', 'escalated', 'unrecoverable'].includes(p as string));
      if (statusParam) {
        filtered = filtered.filter((c) => c.status === statusParam);
      }
      return { rows: [{ total: filtered.length }], rowCount: 1 };
    }

    // 5. Single Case By ID
    if (trimmed.includes('FROM revenue_risk_cases') && trimmed.includes('c.case_id = $1')) {
      const id = params[0] as string;
      const found = this.cases.find((c) => c.case_id === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 6. Cases List Query
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
      if (trimmed.includes('COUNT(*)::int')) {
        return { rows: [{ total: this.webhookEvents.length }], rowCount: 1 };
      }
      return { rows: this.webhookEvents, rowCount: this.webhookEvents.length };
    }

    // Fallback: return empty rows
    return { rows: [], rowCount: 0 };
  }
}

export const devMemoryStore = new DevMemoryStore();
