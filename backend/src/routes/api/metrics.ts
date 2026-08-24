/**
 * routes/api/metrics.ts — Routes for /api/metrics.
 */

import { Router } from 'express';
import { MetricsController } from '../../controllers/metricsController';
import { asyncHandler } from '../../utils/asyncHandler';

export const metricsApiRouter = Router();

metricsApiRouter.get('/', asyncHandler(MetricsController.getMetrics));
