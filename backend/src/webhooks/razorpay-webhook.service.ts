/**
 * webhooks/razorpay-webhook.service.ts
 *
 * Production-grade Razorpay webhook ingestion engine:
 *  1. Cryptographic HMAC-SHA256 signature verification
 *  2. Database-enforced deduplication (idempotency key: x-razorpay-event-id)
 *  3. Fast intake + resilient asynchronous routing
 *  4. Immutable audit logging of all webhook events
 */

import { SignatureService } from './signature.service';
import { EventRouter, eventRouter } from './event-router';
import {
  RazorpayWebhookEvent,
  WebhookIngestParams,
  WebhookProcessingResult,
} from './webhook.types';
import { getPool } from '../database/connection';
import { UnauthorizedError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

export class RazorpayWebhookService {
  constructor(private readonly router: EventRouter = eventRouter) {}

  /**
   * Ingest and process an incoming Razorpay webhook payload.
   */
  public async ingestWebhook(params: WebhookIngestParams): Promise<WebhookProcessingResult> {
    const { rawBody, signature, eventId: headerEventId, payload } = params;

    // 1. Cryptographic signature verification
    const isValid = SignatureService.validateSignature(rawBody, signature);
    if (!isValid) {
      logger.warn('Rejected unauthorized webhook: invalid HMAC signature');
      throw new UnauthorizedError('Invalid Razorpay webhook signature');
    }

    // 2. Validate payload format
    let parsedEvent: RazorpayWebhookEvent;
    try {
      parsedEvent = (typeof payload === 'object' && payload !== null && 'event' in payload)
        ? (payload as unknown as RazorpayWebhookEvent)
        : JSON.parse(rawBody);
    } catch {
      throw new ValidationError('Malformed webhook payload: invalid JSON');
    }

    const eventType = parsedEvent.event;
    if (!eventType || typeof eventType !== 'string') {
      throw new ValidationError('Invalid webhook payload: missing event field');
    }

    // 3. Extract unique event identifier for idempotency
    const razorpayEventId =
      headerEventId ||
      (parsedEvent as unknown as { id?: string }).id ||
      `evt_${parsedEvent.account_id || 'acc'}_${parsedEvent.created_at || Date.now()}_${eventType}`;

    const pool = getPool();

    // 4. Database-enforced Idempotency & Deduplication
    const insertSql = `
      INSERT INTO webhook_events (
        razorpay_event_id,
        event_type,
        raw_payload,
        signature_verified,
        processing_status,
        received_at
      ) VALUES ($1, $2, $3, TRUE, 'received', NOW())
      ON CONFLICT (razorpay_event_id) DO NOTHING
      RETURNING event_id;
    `;

    const insertResult = await pool.query<{ event_id: string }>(insertSql, [
      razorpayEventId,
      eventType,
      JSON.stringify(parsedEvent),
    ]);

    // Duplicate check: if no row returned, this event was already ingested
    if (insertResult.rows.length === 0) {
      logger.info('Duplicate webhook event received — safely ignored', {
        razorpayEventId,
        eventType,
      });

      return {
        status: 'duplicate',
        eventId: razorpayEventId,
        eventType,
        message: 'Duplicate webhook event received and safely ignored',
      };
    }

    const internalEventId = insertResult.rows[0].event_id;

    // 5. Route event to appropriate business handler
    try {
      await pool.query(
        'UPDATE webhook_events SET processing_status = \'processing\' WHERE event_id = $1;',
        [internalEventId]
      );

      const routeResult = await this.router.route(parsedEvent);

      await pool.query(`
        UPDATE webhook_events
        SET
          processing_status = $1,
          processed_at = NOW()
        WHERE event_id = $2;
      `, [routeResult.handled ? 'processed' : 'skipped', internalEventId]);

      logger.info(`Webhook event ${eventType} successfully processed`, {
        razorpayEventId,
        internalEventId,
        handled: routeResult.handled,
      });

      return {
        status: routeResult.handled ? 'processed' : 'skipped',
        eventId: razorpayEventId,
        eventType,
        message: routeResult.handled
          ? `Webhook event ${eventType} processed by ${routeResult.handlerName}`
          : `Webhook event ${eventType} skipped (no handler required)`,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;

      logger.error(`Failed to process webhook event ${eventType}`, {
        razorpayEventId,
        error: errorMessage,
      });

      await pool.query(`
        UPDATE webhook_events
        SET
          processing_status = 'failed',
          error_message = $1,
          error_stack = $2,
          processed_at = NOW()
        WHERE event_id = $3;
      `, [errorMessage, errorStack || null, internalEventId]);

      return {
        status: 'failed',
        eventId: razorpayEventId,
        eventType,
        message: `Webhook processing error: ${errorMessage}`,
      };
    }
  }
}

export const razorpayWebhookService = new RazorpayWebhookService();
