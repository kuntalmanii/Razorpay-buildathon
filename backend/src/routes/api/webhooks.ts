/**
 * routes/api/webhooks.ts — Routes for Razorpay webhooks and event logs.
 */

import { Router } from 'express';
import { WebhooksController } from '../../controllers/webhooksController';
import { RazorpayWebhookController } from '../../webhooks/razorpay-webhook.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';

export const webhooksApiRouter = Router();

// Ingestion endpoints (HMAC signature verification protects these)
webhooksApiRouter.post('/razorpay', asyncHandler(RazorpayWebhookController.handleWebhook));
webhooksApiRouter.post('/razorpay/simulate', asyncHandler(RazorpayWebhookController.simulateWebhook));

// Query / log endpoints — authenticated operators only
webhooksApiRouter.get('/events', requireAuth, asyncHandler(WebhooksController.listEvents));

