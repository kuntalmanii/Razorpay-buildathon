/**
 * routes/api/cases.ts — Routes for /api/recovery-cases.
 */

import { Router } from 'express';
import { CasesController } from '../../controllers/casesController';
import { asyncHandler } from '../../utils/asyncHandler';

export const casesApiRouter = Router();

casesApiRouter.get('/', asyncHandler(CasesController.listCases));
casesApiRouter.get('/:id', asyncHandler(CasesController.getCaseById));
casesApiRouter.get('/:id/audit', asyncHandler(CasesController.getCaseAudit));
