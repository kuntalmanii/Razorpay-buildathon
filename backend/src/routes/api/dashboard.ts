/**
 * routes/api/dashboard.ts — Routes for /api/dashboard.
 */

import { Router } from 'express';
import { DashboardController } from '../../controllers/dashboardController';
import { asyncHandler } from '../../utils/asyncHandler';

export const dashboardApiRouter = Router();

dashboardApiRouter.get('/summary', asyncHandler(DashboardController.getSummary));
dashboardApiRouter.get('/audit', asyncHandler(DashboardController.getAuditLogs));
