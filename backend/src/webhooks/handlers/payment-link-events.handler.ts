/**
 * webhooks/handlers/payment-link-events.handler.ts
 *
 * Handles Razorpay Payment Link lifecycle events:
 *  - `payment_link.paid`
 *  - `payment_link.partially_paid`
 *  - `payment_link.expired`
 *  - `payment_link.cancelled`
 *
 * When a recovery payment link is paid, it closes the associated risk case as RECOVERED.
 */

import { WebhookEventHandler, RazorpayWebhookEvent } from '../webhook.types';
import { getPool } from '../../database/connection';
import { logger } from '../../utils/logger';

export class PaymentLinkEventsHandler implements WebhookEventHandler {
  public readonly supportedEvents = [
    'payment_link.paid',
    'payment_link.partially_paid',
    'payment_link.expired',
    'payment_link.cancelled',
  ];

  public async handle(event: RazorpayWebhookEvent): Promise<void> {
    const plink = event.payload.payment_link?.entity;
    if (!plink) {
      logger.warn('Payment Link event missing payment_link entity', { event: event.event });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const isPaid = event.event === 'payment_link.paid' || event.event === 'payment_link.partially_paid';

      // 1. Identify associated case ID from notes or reference_id
      let caseId = plink.notes?.case_id;
      if (!caseId && plink.reference_id?.startsWith('recov_')) {
        caseId = plink.reference_id.replace('recov_', '');
      }

      if (isPaid && caseId) {
        // Resolve risk case
        const updateCaseRes = await client.query<{ case_id: string }>(`
          UPDATE revenue_risk_cases
          SET
            status = 'recovered',
            recovered_amount = $1,
            resolved_at = NOW(),
            recovery_reason = 'Recovered via Razorpay Payment Link',
            updated_at = NOW()
          WHERE (case_id::text LIKE $2 || '%' OR case_id::text = $2)
            AND status IN ('open', 'in_progress', 'escalated')
          RETURNING case_id;
        `, [plink.amount, caseId]);

        const resolvedCaseId = updateCaseRes.rows[0]?.case_id;

        if (resolvedCaseId) {
          // Complete any scheduled/executing recovery action for this case
          await client.query(`
            UPDATE recovery_actions
            SET
              execution_status = 'completed',
              result = $1,
              executed_at = NOW(),
              updated_at = NOW()
            WHERE case_id = $2 AND action_type = 'create_payment_link';
          `, [JSON.stringify({ payment_link_id: plink.id, amount_paid: plink.amount }), resolvedCaseId]);

          // Write audit log
          await client.query(`
            INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, after_state)
            VALUES ('revenue_risk_cases', $1, 'case_recovered', 'webhook', 'razorpay_payment_link_paid', $2);
          `, [resolvedCaseId, JSON.stringify({ trigger: event.event, payment_link_id: plink.id, amount: plink.amount })]);
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
