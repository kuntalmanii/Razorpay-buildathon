import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import { setPool } from '../database/connection';
import { Pool } from 'pg';

describe('Cases, Actions, Metrics, and Webhooks APIs', () => {
  let mockPool: unknown;

  beforeEach(() => {
    mockPool = {
      query: async (sql: string, params?: unknown[]) => {
        // ─── Metrics queries ───
        if (sql.includes('GROUP BY failure_category')) {
          return {
            rows: [
              { failure_category: 'bank_decline', count: 3 },
              { failure_category: 'network_error', count: 1 },
            ],
          };
        }
        if (sql.includes('GROUP BY action_type')) {
          return {
            rows: [{ action_type: 'retry_payment', count: 4 }],
          };
        }
        if (sql.includes('GROUP BY execution_status')) {
          return {
            rows: [{ execution_status: 'scheduled', count: 2 }],
          };
        }
        if (sql.includes('GROUP BY processing_status')) {
          return {
            rows: [{ processing_status: 'processed', count: 10 }],
          };
        }

        // ─── Cases total count ───
        if (sql.includes('COUNT(*)::int AS total') && sql.includes('FROM revenue_risk_cases')) {
          return { rows: [{ total: 2 }] };
        }

        // ─── Cases items ───
        if (sql.includes('FROM revenue_risk_cases c')) {
          if (sql.includes('WHERE c.case_id = $1')) {
            const requestedId = params?.[0];
            if (requestedId === 'case-existing-123') {
              return {
                rows: [
                  {
                    case_id: 'case-existing-123',
                    merchant_id: 'merch-1',
                    amount_at_risk: '500000',
                    currency: 'INR',
                    failure_category: 'bank_decline',
                    risk_score: '0.8500',
                    status: 'open',
                    merchant_name: 'Acme Corp',
                  },
                ],
              };
            }
            return { rows: [] }; // Not found
          }
          return {
            rows: [
              {
                case_id: 'case-1',
                merchant_id: 'merch-1',
                amount_at_risk: '500000',
                currency: 'INR',
                failure_category: 'bank_decline',
                risk_score: '0.8500',
                status: 'open',
              },
              {
                case_id: 'case-2',
                merchant_id: 'merch-1',
                amount_at_risk: '150000',
                currency: 'INR',
                failure_category: 'network_error',
                risk_score: '0.6000',
                status: 'in_progress',
              },
            ],
          };
        }

        // ─── Audit logs ───
        if (sql.includes('FROM audit_logs')) {
          return {
            rows: [
              {
                log_id: 'log-1',
                entity_type: 'revenue_risk_cases',
                entity_id: 'case-existing-123',
                action: 'case_opened',
                actor_type: 'system',
                actor_id: 'risk-detector',
                created_at: new Date().toISOString(),
              },
            ],
          };
        }

        // ─── Actions ───
        if (sql.includes('FROM recovery_actions')) {
          if (sql.includes('COUNT(*)::int AS total')) {
            return { rows: [{ total: 1 }] };
          }
          return {
            rows: [
              {
                action_id: 'action-1',
                case_id: 'case-1',
                action_type: 'retry_payment',
                execution_status: 'scheduled',
                idempotency_key: 'idm-1',
              },
            ],
          };
        }

        // ─── Webhooks list ───
        if (sql.includes('FROM webhook_events')) {
          if (sql.includes('COUNT(*)::int AS total')) {
            return { rows: [{ total: 1 }] };
          }
          return {
            rows: [
              {
                event_id: 'evt-1',
                razorpay_event_id: 'rzp_evt_001',
                event_type: 'payment.failed',
                signature_verified: true,
                processing_status: 'processed',
              },
            ],
          };
        }

        return { rows: [] };
      },
      connect: async () => ({
        query: async () => ({ rows: [{ '?column?': 1 }] }),
        release: () => {},
      }),
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: () => {},
    };

    setPool(mockPool as Pool);
  });

  afterEach(() => {
    setPool(null);
  });

  it('GET /api/recovery-cases returns list of cases with pagination meta', async () => {
    const res = await request(app).get('/api/recovery-cases?page=1&limit=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.meta.total, 2);
    assert.equal(res.body.meta.page, 1);
    assert.equal(res.body.meta.limit, 10);
    assert.equal(res.body.meta.pages, 1);
  });

  it('GET /api/recovery-cases/:id returns single case when found', async () => {
    const res = await request(app).get('/api/recovery-cases/case-existing-123');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.case_id, 'case-existing-123');
    assert.equal(res.body.data.merchant_name, 'Acme Corp');
  });

  it('GET /api/recovery-cases/:id returns 404 when not found', async () => {
    const res = await request(app).get('/api/recovery-cases/case-non-existent');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NotFoundError');
  });

  it('GET /api/recovery-cases/:id/audit returns audit logs for case', async () => {
    const res = await request(app).get('/api/recovery-cases/case-existing-123/audit');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.data[0].action, 'case_opened');
  });

  it('GET /api/recovery-actions returns actions list', async () => {
    const res = await request(app).get('/api/recovery-actions');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].action_type, 'retry_payment');
  });

  it('GET /api/metrics returns breakdown summary', async () => {
    const res = await request(app).get('/api/metrics?days=14');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.period_days, 14);
    assert.equal(res.body.data.cases_by_failure_category.bank_decline, 3);
    assert.equal(res.body.data.actions_by_type.retry_payment, 4);
    assert.equal(res.body.data.webhooks_by_status.processed, 10);
  });

  it('GET /api/webhooks/events returns events list with pagination meta', async () => {
    const res = await request(app).get('/api/webhooks/events');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data[0].razorpay_event_id, 'rzp_evt_001');
    assert.equal(res.body.meta.total, 1);
  });
});
