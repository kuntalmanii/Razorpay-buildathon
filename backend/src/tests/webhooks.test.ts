import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import { SignatureService } from '../webhooks/signature.service';
import { setPool } from '../database/connection';
import { config } from '../config';
import { Pool } from 'pg';

describe('Production-Grade Razorpay Webhook Ingestion', () => {
  const TEST_SECRET = config.razorpay.webhookSecret;
  let mockPool: unknown;
  let insertedEventIds: Set<string>;

  beforeEach(() => {
    insertedEventIds = new Set<string>();

    mockPool = {
      query: async (sql: string, params?: unknown[]) => {
        // ─── Webhook events insertion (deduplication check) ───
        if (sql.includes('INSERT INTO webhook_events')) {
          const razorpayEventId = params?.[0] as string;
          if (insertedEventIds.has(razorpayEventId)) {
            // Duplicate! ON CONFLICT DO NOTHING returns 0 rows
            return { rows: [] };
          }
          insertedEventIds.add(razorpayEventId);
          return { rows: [{ event_id: `uuid_${razorpayEventId}` }] };
        }

        // ─── Status updates ───
        if (sql.includes('UPDATE webhook_events')) {
          return { rows: [] };
        }

        // ─── Merchant lookup ───
        if (sql.includes('FROM merchants')) {
          return { rows: [{ merchant_id: 'm1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' }] };
        }

        // ─── Payments upsert ───
        if (sql.includes('INSERT INTO payments')) {
          return { rows: [{ payment_id: 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' }] };
        }

        // ─── Payments update ───
        if (sql.includes('UPDATE payments')) {
          return { rows: [{ payment_id: 'p1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c', merchant_id: 'm1' }] };
        }

        // ─── Risk cases queries ───
        if (sql.includes('FROM revenue_risk_cases')) {
          return { rows: [] }; // No existing case
        }
        if (sql.includes('INSERT INTO revenue_risk_cases')) {
          return { rows: [{ case_id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' }] };
        }
        if (sql.includes('UPDATE revenue_risk_cases')) {
          return { rows: [{ case_id: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' }] };
        }

        // ─── Subscriptions update ───
        if (sql.includes('UPDATE subscriptions')) {
          return { rows: [{ subscription_id: 'sub_001', merchant_id: 'm1' }] };
        }

        // ─── Recovery actions update ───
        if (sql.includes('UPDATE recovery_actions')) {
          return { rows: [] };
        }

        // ─── Audit logs insert ───
        if (sql.includes('INSERT INTO audit_logs')) {
          return { rows: [{ log_id: 'log_001' }] };
        }

        return { rows: [] };
      },
      connect: async () => ({
        query: async (sql: string, params?: unknown[]) => (mockPool as { query: (s: string, p?: unknown[]) => Promise<unknown> }).query(sql, params),
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

  describe('1. Signature Validation', () => {
    it('accepts payload with valid HMAC-SHA256 signature', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_test_001',
        event: 'payment.authorized',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_test_valid_sig',
              amount: 50000,
              status: 'authorized',
            },
          },
        },
        created_at: 1700000000,
      };

      const rawBody = JSON.stringify(payload);
      const signature = SignatureService.generateSignature(rawBody, TEST_SECRET);

      assert.equal(SignatureService.validateSignature(rawBody, signature, TEST_SECRET), true);
      assert.equal(SignatureService.validateSignature(rawBody, 'invalid_sig_hex_12345', TEST_SECRET), false);
    });

    it('rejects unverified webhooks with HTTP 401 Unauthorized', async () => {
      const payload = {
        entity: 'event',
        event: 'payment.failed',
        payload: {},
      };

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', 'bad_signature_1234567890')
        .set('x-razorpay-event-id', 'evt_unverified_001')
        .send(payload);

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'UnauthorizedError');
    });
  });

  describe('2. Idempotency and Duplicate Handling', () => {
    it('processes first webhook delivery, then safely ignores duplicates', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_001',
        event: 'payment.failed',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_test_duplicate_check',
              amount: 250000,
              currency: 'INR',
              error_code: 'BAD_REQUEST_ERROR',
            },
          },
        },
        created_at: 1700000000,
      };

      const rawBody = JSON.stringify(payload);
      const signature = SignatureService.generateSignature(rawBody, TEST_SECRET);
      const eventId = 'evt_duplicate_idempotency_test_001';

      // 1st Delivery
      const res1 = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      assert.equal(res1.status, 200);
      assert.equal(res1.body.success, true);
      assert.equal(res1.body.data.status, 'processed');

      // 2nd Delivery (same event ID)
      const res2 = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', eventId)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      assert.equal(res2.status, 200);
      assert.equal(res2.body.success, true);
      assert.equal(res2.body.data.status, 'duplicate');
      assert.ok(res2.body.data.message.includes('Duplicate'));
    });
  });

  describe('3. Payload Validation and Unknown Events', () => {
    it('handles unknown events gracefully by skipping without error', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_001',
        event: 'unknown.future.razorpay.event',
        contains: [],
        payload: {},
        created_at: 1700000000,
      };

      const rawBody = JSON.stringify(payload);
      const signature = SignatureService.generateSignature(rawBody, TEST_SECRET);

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_unknown_001')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'skipped');
    });

    it('rejects invalid webhook payload without event field', async () => {
      const rawBody = JSON.stringify({ entity: 'event' }); // Missing 'event' property
      const signature = SignatureService.generateSignature(rawBody, TEST_SECRET);

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('Content-Type', 'application/json')
        .send(rawBody);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'ValidationError');
    });
  });

  describe('4. Specific Event Handlers Execution', () => {
    it('handles payment_link.paid event and triggers recovery resolution', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_001',
        event: 'payment_link.paid',
        contains: ['payment_link'],
        payload: {
          payment_link: {
            entity: {
              id: 'plink_test_wh_001',
              amount: 500000,
              reference_id: 'recov_case-uuid-1234',
              notes: {
                case_id: 'case-uuid-1234',
              },
            },
          },
        },
        created_at: 1700000000,
      };

      const rawBody = JSON.stringify(payload);
      const signature = SignatureService.generateSignature(rawBody, TEST_SECRET);

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_plink_paid_001')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'processed');
    });

    it('handles subscription.halted event and triggers risk case tracking', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_001',
        event: 'subscription.halted',
        contains: ['subscription'],
        payload: {
          subscription: {
            entity: {
              id: 'sub_test_halted_001',
              plan_id: 'plan_pro',
              status: 'halted',
              paid_count: 2,
              total_count: 12,
            },
          },
        },
        created_at: 1700000000,
      };

      const rawBody = JSON.stringify(payload);
      const signature = SignatureService.generateSignature(rawBody, TEST_SECRET);

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('x-razorpay-signature', signature)
        .set('x-razorpay-event-id', 'evt_sub_halted_001')
        .set('Content-Type', 'application/json')
        .send(rawBody);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'processed');
    });
  });

  describe('5. Dev-Only Webhook Simulation', () => {
    it('POST /api/webhooks/razorpay/simulate processes simulated webhook in development', async () => {
      const payload = {
        entity: 'event',
        account_id: 'acc_dev_sim',
        event: 'payment.captured',
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: 'pay_sim_001',
              amount: 150000,
              status: 'captured',
            },
          },
        },
        created_at: 1700000000,
      };

      const res = await request(app)
        .post('/api/webhooks/razorpay/simulate')
        .send(payload);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.simulation, true);
    });
  });
});
