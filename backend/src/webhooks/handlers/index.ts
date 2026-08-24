/**
 * webhooks/handlers/index.ts
 *
 * Barrel export and registry builder for all Razorpay webhook event handlers.
 */

import { WebhookEventHandler } from '../webhook.types';
import { PaymentFailedHandler } from './payment-failed.handler';
import { PaymentCapturedHandler } from './payment-captured.handler';
import { SubscriptionEventsHandler } from './subscription-events.handler';
import { PaymentLinkEventsHandler } from './payment-link-events.handler';

export * from './payment-failed.handler';
export * from './payment-captured.handler';
export * from './subscription-events.handler';
export * from './payment-link-events.handler';

export function createDefaultHandlers(): WebhookEventHandler[] {
  return [
    new PaymentFailedHandler(),
    new PaymentCapturedHandler(),
    new SubscriptionEventsHandler(),
    new PaymentLinkEventsHandler(),
  ];
}
