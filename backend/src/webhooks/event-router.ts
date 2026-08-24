/**
 * webhooks/event-router.ts
 *
 * Dispatches verified Razorpay webhook events to the appropriate handler.
 * Safe against unknown/unsupported events — logs and skips gracefully without failing.
 */

import { WebhookEventHandler, RazorpayWebhookEvent } from './webhook.types';
import { createDefaultHandlers } from './handlers';
import { logger } from '../utils/logger';

export class EventRouter {
  private readonly handlers: WebhookEventHandler[];

  constructor(handlers: WebhookEventHandler[] = createDefaultHandlers()) {
    this.handlers = handlers;
  }

  /**
   * Route an event to the registered handler for that event type.
   */
  public async route(event: RazorpayWebhookEvent): Promise<{ handled: boolean; handlerName?: string }> {
    const eventType = event.event;

    for (const handler of this.handlers) {
      if (handler.supportedEvents.includes(eventType)) {
        const handlerName = handler.constructor.name;
        logger.info(`Routing webhook event ${eventType} to ${handlerName}`);
        await handler.handle(event);
        return { handled: true, handlerName };
      }
    }

    logger.debug(`No specific handler registered for webhook event: ${eventType} (safely skipped)`);
    return { handled: false };
  }
}

export const eventRouter = new EventRouter();
