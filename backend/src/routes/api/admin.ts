/**
 * routes/api/admin.ts
 *
 * Dedicated admin endpoints strictly protected by requireRole('admin').
 * Standard merchant users receive 403 Forbidden.
 */

import { Router } from 'express';
import { AdminController } from '../../modules/admin/admin.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireRole } from '../../middleware/requireRole';

export const adminApiRouter = Router();

// Strictly enforce admin role for all routes mounted under /api/admin
adminApiRouter.use(requireRole('admin'));

adminApiRouter.get('/overview', asyncHandler(AdminController.getOverview));
adminApiRouter.get('/users', asyncHandler(AdminController.getUsers));
adminApiRouter.get('/recovery', asyncHandler(AdminController.getRecovery));
adminApiRouter.get('/ai-decisions', asyncHandler(AdminController.getAiDecisions));
adminApiRouter.get('/policies', asyncHandler(AdminController.getPolicies));
adminApiRouter.get('/audit', asyncHandler(AdminController.getAudit));
