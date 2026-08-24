import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import {
  RazorpayClient,
  RazorpayPaymentService,
  RazorpaySubscriptionService,
  RazorpayPaymentLinkService,
  RazorpayAuthError,
  RazorpayValidationError,
  RazorpayRateLimitError,
  RazorpayTimeoutError,
  RazorpayApiError,
  RazorpayConfigError,
  maskKey,
  setRazorpayClient,
} from '../services/razorpay';
import { ValidationError } from '../utils/errors';

describe('Razorpay Test Mode Integration', () => {
  describe('Client Configuration & Security Guards', () => {
    it('masks key IDs correctly', () => {
      assert.equal(maskKey('rzp_test_1234567890abcdef'), 'rzp_test...cdef');
      assert.equal(maskKey('short'), '********');
      assert.equal(maskKey(undefined), '********');
    });

    it('rejects live key prefixes immediately with RazorpayConfigError', () => {
      assert.throws(
        () => {
          new RazorpayClient({
            keyId: 'rzp_live_99999999999999',
            keySecret: 'secret_live_123',
          });
        },
        (err: Error) => {
          assert.ok(err instanceof RazorpayConfigError);
          assert.ok(err.message.includes('TEST MODE keys'));
          return true;
        }
      );
    });

    it('initializes cleanly with test key prefix (rzp_test_)', () => {
      const client = new RazorpayClient({
        keyId: 'rzp_test_AbCd1234EfGh5678',
        keySecret: 'test_secret_12345',
      });
      assert.equal(client.isConfigured(), true);
      assert.equal(client.getMaskedKeyId(), 'rzp_test...5678');
    });

    it('fails gracefully when client is unconfigured', async () => {
      const client = new RazorpayClient({ keyId: '', keySecret: '' });
      assert.equal(client.isConfigured(), false);
      const health = await client.healthCheck();
      assert.equal(health.status, 'unconfigured');
      assert.equal(health.isTestMode, false);

      await assert.rejects(
        () => client.request({ method: 'GET', path: '/payments/pay_123' }),
        RazorpayConfigError
      );
    });
  });

  describe('Payment Service (Mocked)', () => {
    let mockClient: RazorpayClient;
    let paymentService: RazorpayPaymentService;

    beforeEach(() => {
      mockClient = new RazorpayClient({
        keyId: 'rzp_test_1111222233334444',
        keySecret: 'test_secret',
      });

      paymentService = new RazorpayPaymentService(mockClient);
    });

    it('rejects empty payment ID with ValidationError', async () => {
      await assert.rejects(() => paymentService.fetchPayment(''), ValidationError);
    });

    it('fetches payment successfully with typed response', async () => {
      mockClient.request = async <T>(opts: { path: string }): Promise<T> => {
        assert.equal(opts.path, '/payments/pay_test_001');
        return {
          id: 'pay_test_001',
          entity: 'payment',
          amount: 50000,
          currency: 'INR',
          status: 'captured',
          method: 'card',
          captured: true,
          amount_refunded: 0,
          international: false,
          created_at: 1700000000,
        } as unknown as T;
      };

      const payment = await paymentService.fetchPayment('pay_test_001');
      assert.equal(payment.id, 'pay_test_001');
      assert.equal(payment.amount, 50000);
      assert.equal(payment.status, 'captured');
    });

    it('fetches card details or returns null on failure', async () => {
      mockClient.request = async <T>(): Promise<T> => {
        return {
          id: 'card_001',
          entity: 'card',
          last4: '4242',
          network: 'Visa',
          type: 'credit',
        } as unknown as T;
      };

      const card = await paymentService.fetchPaymentCard('pay_test_001');
      assert.equal(card?.last4, '4242');
      assert.equal(card?.network, 'Visa');
    });

    it('fetches payment attempts for an order', async () => {
      mockClient.request = async <T>(): Promise<T> => {
        return {
          entity: 'collection',
          count: 1,
          items: [
            {
              id: 'pay_test_002',
              entity: 'payment',
              amount: 100000,
              currency: 'INR',
              status: 'failed',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Card declined',
            },
          ],
        } as unknown as T;
      };

      const payments = await paymentService.fetchPaymentsForOrder('order_001');
      assert.equal(payments.length, 1);
      assert.equal(payments[0].status, 'failed');
    });
  });

  describe('Subscription Service (Mocked)', () => {
    let mockClient: RazorpayClient;
    let subService: RazorpaySubscriptionService;

    beforeEach(() => {
      mockClient = new RazorpayClient({
        keyId: 'rzp_test_1111222233334444',
        keySecret: 'test_secret',
      });
      subService = new RazorpaySubscriptionService(mockClient);
    });

    it('rejects empty subscription ID with ValidationError', async () => {
      await assert.rejects(() => subService.fetchSubscription(''), ValidationError);
    });

    it('fetches subscription details with typed response', async () => {
      mockClient.request = async <T>(opts: { path: string }): Promise<T> => {
        assert.equal(opts.path, '/subscriptions/sub_test_001');
        return {
          id: 'sub_test_001',
          entity: 'subscription',
          plan_id: 'plan_pro_monthly',
          status: 'halted',
          paid_count: 3,
          total_count: 12,
          quantity: 1,
          created_at: 1700000000,
        } as unknown as T;
      };

      const sub = await subService.fetchSubscription('sub_test_001');
      assert.equal(sub.id, 'sub_test_001');
      assert.equal(sub.status, 'halted');
      assert.equal(sub.paid_count, 3);
    });

    it('fetches subscription invoices', async () => {
      mockClient.request = async <T>(): Promise<T> => {
        return {
          entity: 'collection',
          count: 1,
          items: [
            {
              id: 'inv_001',
              entity: 'invoice',
              subscription_id: 'sub_test_001',
              status: 'issued',
              amount: 99900,
              currency: 'INR',
              created_at: 1700000000,
            },
          ],
        } as unknown as T;
      };

      const invoices = await subService.fetchSubscriptionInvoices('sub_test_001');
      assert.equal(invoices.length, 1);
      assert.equal(invoices[0].amount, 99900);
    });
  });

  describe('Payment Link Service (Mocked Recovery Flows)', () => {
    let mockClient: RazorpayClient;
    let plinkService: RazorpayPaymentLinkService;

    beforeEach(() => {
      mockClient = new RazorpayClient({
        keyId: 'rzp_test_1111222233334444',
        keySecret: 'test_secret',
      });
      plinkService = new RazorpayPaymentLinkService(mockClient);
    });

    it('validates positive amount in paise', async () => {
      await assert.rejects(
        () => plinkService.createPaymentLink({ amount: 0 }),
        ValidationError
      );
      await assert.rejects(
        () => plinkService.createPaymentLink({ amount: -500 }),
        ValidationError
      );
    });

    it('creates recovery Payment Link with case metadata and customer details', async () => {
      mockClient.request = async <T>(opts: { method: string; path: string; body?: unknown }): Promise<T> => {
        assert.equal(opts.method, 'POST');
        assert.equal(opts.path, '/payment_links');

        const body = opts.body as Record<string, unknown>;
        assert.equal(body.amount, 250000);
        assert.equal(body.currency, 'INR');
        assert.ok((body.reference_id as string).includes('recov_case-uuid-999'));

        return {
          id: 'plink_test_001',
          entity: 'payment_link',
          short_url: 'https://rzp.io/i/testlink01',
          amount: 250000,
          currency: 'INR',
          status: 'created',
          created_at: 1700000000,
        } as unknown as T;
      };

      const link = await plinkService.createRecoveryPaymentLink({
        caseId: 'case-uuid-999',
        amountPaise: 250000,
        customerName: 'Priya Mehta',
        customerEmail: 'priya@example.dev',
      });

      assert.equal(link.id, 'plink_test_001');
      assert.equal(link.short_url, 'https://rzp.io/i/testlink01');
    });

    it('fetches and cancels payment links', async () => {
      mockClient.request = async <T>(opts: { method: string; path: string }): Promise<T> => {
        if (opts.method === 'GET') {
          return {
            id: 'plink_test_001',
            status: 'created',
            amount: 50000,
          } as unknown as T;
        }
        if (opts.method === 'POST' && opts.path.includes('/cancel')) {
          return {
            id: 'plink_test_001',
            status: 'cancelled',
            amount: 50000,
          } as unknown as T;
        }
        throw new Error('Unexpected request');
      };

      const fetched = await plinkService.fetchPaymentLink('plink_test_001');
      assert.equal(fetched.status, 'created');

      const cancelled = await plinkService.cancelPaymentLink('plink_test_001');
      assert.equal(cancelled.status, 'cancelled');
    });
  });

  describe('Error Mapping & Network Fault Handling', () => {
    let client: RazorpayClient;

    beforeEach(() => {
      client = new RazorpayClient({
        keyId: 'rzp_test_1111222233334444',
        keySecret: 'test_secret',
        baseUrl: 'http://localhost:59999', // dummy URL
      });
    });

    it('maps 401 to RazorpayAuthError', async () => {
      // Stub global fetch for this test
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ error: { description: 'Invalid API Key' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });

      try {
        await assert.rejects(
          () => client.request({ method: 'GET', path: '/payments/pay_1' }),
          RazorpayAuthError
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('maps 400 to RazorpayValidationError with field details', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            error: {
              code: 'BAD_REQUEST_ERROR',
              description: 'amount is required',
              field: 'amount',
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        await assert.rejects(
          () => client.request({ method: 'POST', path: '/payment_links' }),
          (err: Error) => {
            assert.ok(err instanceof RazorpayValidationError);
            assert.equal(err.fields?.amount, 'amount is required');
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('maps 429 to RazorpayRateLimitError', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ error: { description: 'Rate limit exceeded' } }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        await assert.rejects(
          () => client.request({ method: 'GET', path: '/payments' }),
          RazorpayRateLimitError
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('maps 500 to RazorpayApiError', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({ error: { description: 'Gateway error' } }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );

      try {
        await assert.rejects(
          () => client.request({ method: 'GET', path: '/payments' }),
          RazorpayApiError
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('maps timeout / AbortError to RazorpayTimeoutError', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      };

      try {
        await assert.rejects(
          () => client.request({ method: 'GET', path: '/payments' }),
          RazorpayTimeoutError
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('HTTP Endpoint: GET /api/health/razorpay', () => {
    it('returns Razorpay health in standard envelope without exposing secrets', async () => {
      const mockClient = new RazorpayClient({
        keyId: 'rzp_test_Safe1234Secret56',
        keySecret: 'super_secret_dont_leak',
      });
      setRazorpayClient(mockClient);

      const res = await request(app).get('/api/health/razorpay');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.status, 'ok');
      assert.equal(res.body.data.isTestMode, true);
      assert.equal(res.body.data.maskedKeyId, 'rzp_test...et56');

      // Security check: raw secret must never appear anywhere in the body
      const jsonText = JSON.stringify(res.body);
      assert.equal(jsonText.includes('super_secret_dont_leak'), false);

      setRazorpayClient(null);
    });
  });
});
