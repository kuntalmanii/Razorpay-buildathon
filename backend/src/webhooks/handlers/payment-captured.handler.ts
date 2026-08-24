/**
 * webhooks/handlers/payment-captured.handler.ts
 *
 * Handles `payment.captured` and `payment.authorized` events.
 * Updates payment status in database and resolves any open revenue risk cases.
 */

import { WebhookEventHandler, RazorpayWebhookEvent } from '../webhook.types';
import { getPool } from '../../database/connection';
import { logger } from '../../utils/logger';

export class PaymentCapturedHandler implements WebhookEventHandler {
  public readonly supportedEvents = ['payment.captured', 'payment.authorized'];

  public async handle(event: RazorpayWebhookEvent): Promise<void> {
    const payment = event.payload.payment?.entity;
    if (!payment) {
      logger.warn('payment.captured webhook event missing payment entity');
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const isCaptured = event.event === 'payment.captured';
      const newStatus = isCaptured ? 'captured' : 'authorized';

      // 1. Update payment record if it exists
      const paymentUpdateRes = await client.query<{ payment_id: string }>(`
        UPDATE payments
        SET
          status = $1,
          captured_at = CASE WHEN $2 THEN NOW() ELSE captured_at END,
          authorized_at = CASE WHEN NOT $2 THEN NOW() ELSE authorized_at END,
          updated_at = NOW()
        WHERE razorpay_payment_id = $3
        RETURNING payment_id, merchant_id;
      `, [newStatus, isCaptured, payment.id]);

      const paymentRecord = paymentUpdateRes.rows[0];

      // 2. If payment is captured, resolve any associated revenue risk case
      if (isCaptured && paymentRecord) {
        const caseUpdateRes = await client.query<{ case_id: string }>(`
          UPDATE revenue_risk_cases
          SET
            status = 'recovered',
            recovered_amount = $1,
            resolved_at = NOW(),
            recovery_reason = 'Payment successfully captured via Razorpay',
            updated_at = NOW()
          WHERE payment_id = $2 AND status IN ('open', 'in_progress', 'escalated')
          RETURNING case_id;
        `, [payment.amount, paymentRecord.payment_id]);

        for (const row of caseUpdateRes.rows) {
          await client.query(`
            INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, after_state)
            VALUES ('revenue_risk_cases', $1, 'case_recovered', 'webhook', 'razorpay_payment_captured', $2);
          `, [row.case_id, JSON.stringify({ trigger: 'payment.captured', amount: payment.amount })]);
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
