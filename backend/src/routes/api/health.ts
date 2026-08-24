/**
 * routes/api/health.ts — Health check routes for /api/health.
 */

import { Router } from 'express';
import { ApiHealthController } from '../../controllers/apiHealthController';
import { asyncHandler } from '../../utils/asyncHandler';

export const healthApiRouter = Router();

healthApiRouter.get('/', asyncHandler(ApiHealthController.getHealth));
healthApiRouter.get('/razorpay', asyncHandler(ApiHealthController.getRazorpayHealth));
