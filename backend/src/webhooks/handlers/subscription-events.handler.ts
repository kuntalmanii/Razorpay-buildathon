/**
 * webhooks/handlers/subscription-events.handler.ts
 *
 * Handles subscription status changes:
 *  - `subscription.halted`
 *  - `subscription.pending`
 *  - `subscription.cancelled`
 *  - `subscription.paused`
 *  - `subscription.resumed`
 *  - `subscription.charged`
 */

import { WebhookEventHandler, RazorpayWebhookEvent } from '../webhook.types';
import { getPool } from '../../database/connection';
import { logger } from '../../utils/logger';

export class SubscriptionEventsHandler implements WebhookEventHandler {
  public readonly supportedEvents = [
    'subscription.halted',
    'subscription.pending',
    'subscription.cancelled',
    'subscription.paused',
    'subscription.resumed',
    'subscription.charged',
  ];

  public async handle(event: RazorpayWebhookEvent): Promise<void> {
    const sub = event.payload.subscription?.entity;
    if (!sub) {
      logger.warn('Subscription event missing subscription entity', { event: event.event });
      return;
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const isHalted = event.event === 'subscription.halted';
      const isCharged = event.event === 'subscription.charged';
      const isCancelled = event.event === 'subscription.cancelled';

      // 1. Map event to status
      let newStatus: string = sub.status || 'active';
      if (isHalted) newStatus = 'halted';
      if (isCancelled) newStatus = 'cancelled';
      if (event.event === 'subscription.pending') newStatus = 'pending';

      // 2. Update subscription record if present
      const subUpdateRes = await client.query<{ subscription_id: string; merchant_id: string }>(`
        UPDATE subscriptions
        SET
          status = $1::subscription_status,
          paid_count = COALESCE($2, paid_count),
          charge_at = CASE WHEN $3::bigint IS NOT NULL THEN TO_TIMESTAMP($3::bigint) ELSE charge_at END,
          updated_at = NOW()
        WHERE razorpay_subscription_id = $4
        RETURNING subscription_id, merchant_id;
      `, [newStatus, sub.paid_count, sub.charge_at || null, sub.id]);

      const subRecord = subUpdateRes.rows[0];

      // 3. If halted: create risk case if not already open
      if (isHalted && subRecord) {
        const existingCaseRes = await client.query(
          'SELECT case_id FROM revenue_risk_cases WHERE subscription_id = $1 AND status IN (\'open\', \'in_progress\');',
          [subRecord.subscription_id]
        );

        if (existingCaseRes.rows.length === 0) {
          const caseInsertSql = `
            INSERT INTO revenue_risk_cases (
              merchant_id,
              subscription_id,
              amount_at_risk,
              currency,
              failure_category,
              risk_score,
              recovery_probability,
              status,
              detected_at
            ) VALUES ($1, $2, 99900, 'INR', 'subscription_halt', 0.9000, 0.6000, 'open', NOW())
            RETURNING case_id;
          `;
          const caseRes = await client.query<{ case_id: string }>(caseInsertSql, [
            subRecord.merchant_id,
            subRecord.subscription_id,
          ]);

          const caseId = caseRes.rows[0]?.case_id;
          if (caseId) {
            await client.query(`
              INSERT INTO audit_logs (entity_type, entity_id, action, actor_type, actor_id, after_state)
              VALUES ('revenue_risk_cases', $1, 'case_opened', 'webhook', 'razorpay_subscription_halted', $2);
            `, [caseId, JSON.stringify({ trigger: event.event, subscription_id: sub.id })]);
          }
        }
      }

      // 4. If charged: resolve any open risk case for this subscription
      if (isCharged && subRecord) {
        await client.query(`
          UPDATE revenue_risk_cases
          SET
            status = 'recovered',
            resolved_at = NOW(),
            recovery_reason = 'Subscription successfully charged',
            updated_at = NOW()
          WHERE subscription_id = $1 AND status IN ('open', 'in_progress', 'escalated');
        `, [subRecord.subscription_id]);
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
