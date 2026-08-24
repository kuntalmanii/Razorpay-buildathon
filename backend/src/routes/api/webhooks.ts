/**
 * routes/api/webhooks.ts — Routes for Razorpay webhooks and event logs.
 */

import { Router } from 'express';
import { WebhooksController } from '../../controllers/webhooksController';
import { RazorpayWebhookController } from '../../webhooks/razorpay-webhook.controller';
import { asyncHandler } from '../../utils/asyncHandler';

export const webhooksApiRouter = Router();

// Ingestion endpoints
webhooksApiRouter.post('/razorpay', asyncHandler(RazorpayWebhookController.handleWebhook));
webhooksApiRouter.post('/razorpay/simulate', asyncHandler(RazorpayWebhookController.simulateWebhook));

// Query / log endpoints
webhooksApiRouter.get('/events', asyncHandler(WebhooksController.listEvents));
