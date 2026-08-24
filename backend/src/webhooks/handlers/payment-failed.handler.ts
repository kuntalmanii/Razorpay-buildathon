/**
 * webhooks/handlers/payment-failed.handler.ts
 *
 * Handles `payment.failed` webhook event.
 * Upserts the payment failure record into PostgreSQL and initiates revenue risk tracking.
 */

import { WebhookEventHandler, RazorpayWebhookEvent } from '../webhook.types';
import { getPool } from '../../database/connection';
import { logger } from '../../utils/logger';

export class PaymentFailedHandler implements WebhookEventHandler {
  public readonly supportedEvents = ['payment.failed'];

  public async handle(event: RazorpayWebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    if (!payment) {
      logger.warn('payment.failed webhook event missing payment entity', { event_id: event.account_id });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Find or default merchant ID
      const merchantResult = await client.query<{ merchant_id: string }>(
        'SELECT merchant_id FROM merchants LIMIT 1;'
      );
      const merchantId = merchantResult.rows[0]?.merchant_id;

      if (!merchantId) {
        logger.warn('No merchant found in database to associate with payment.failed event');
        await client.query('COMMIT');
        return;
      }

      // 2. Upsert payment record
      const paymentUpsertSql = `
        INSERT INTO payments (
          merchant_id,
          razorpay_payment_id,
          razorpay_order_id,
          amount,
          currency,
          status,
          method,
          description,
          error_code,
          error_description,
          failed_at
        ) VALUES ($1, $2, $3, $4, $5, 'failed', $6, $7, $8, $9, TO_TIMESTAMP($10))
        ON CONFLICT (razorpay_payment_id)
        DO UPDATE SET
          status = 'failed',
          error_code = EXCLUDED.error_code,
          error_description = EXCLUDED.error_description,
          failed_at = EXCLUDED.failed_at,
          updated_at = NOW()
        RETURNING payment_id;
      `;

      const paymentRes = await client.query<{ payment_id: string }>(paymentUpsertSql, [
        merchantId,
        payment.id,
        payment.order_id || null,
        payment.amount,
        payment.currency || 'INR',
        payment.method || null,
        payment.description || null,
        payment.error_code || 'PAYMENT_FAILED',
        payment.error_description || payment.error_reason || 'Payment failed',
        payment.created_at || Math.floor(Date.now() / 1000),
      ]);

      const paymentId = paymentRes.rows[0]?.payment_id;

      // 3. Create or update risk case if not already existing for this payment
      if (paymentId) {
        const existingCaseRes = await client.query(
          'SELECT case_id FROM revenue_risk_cases WHERE payment_id = $1;',
          [paymentId]
        );

        if (existingCaseRes.rows.length === 0) {
          const failureCategory = payment.error_code === 'BAD_REQUEST_ERROR'
            ? 'bank_decline'
            : (payment.error_code === 'GATEWAY_ERROR' ? 'network_error' : 'payment_failure');

          const caseInsertSql = `
            INSERT INTO revenue_risk_cases (
              merchant_id,
              payment_id,
              amount_at_risk,
              currency,
              failure_category,
              risk_score,
              recovery_probability,
              status,
              detected_at
            ) VALUES ($1, $2, $3, $4, $5, 0.7500, 0.6500, 'open', NOW())
            RETURNING case_id;
          `;

          const caseRes = await client.query<{ case_id: string }>(caseInsertSql, [
            merchantId,
            paymentId,
            payment.amount,
            payment.currency || 'INR',
            failureCategory,
          ]);

          const caseId = caseRes.rows[0]?.case_id;

          if (caseId) {
            await client.query(`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, after_state)
              VALUES ('revenue_risk_cases', $1, 'case_opened', 'webhook', 'razorpay_payment_failed', $2);
            `, [caseId, JSON.stringify({ trigger: 'payment.failed', payment_id: payment.id })]);
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
