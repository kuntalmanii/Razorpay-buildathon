/**
 * routes/api/webhooks.ts — Routes for /api/webhooks/events.
 */

import { Router } from 'express';
import { WebhooksController } from '../../controllers/webhooksController';
import { asyncHandler } from '../../utils/asyncHandler';

export const webhooksApiRouter = Router();

webhooksApiRouter.get('/events', asyncHandler(WebhooksController.listEvents));
