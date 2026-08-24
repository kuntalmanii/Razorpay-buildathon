/**
 * routes/api/cases.ts — Routes for /api/recovery-cases.
 */

import { Router } from 'express';
import { CasesController } from '../../controllers/casesController';
import { asyncHandler } from '../../utils/asyncHandler';

export const casesApiRouter = Router();

casesApiRouter.get('/', asyncHandler(CasesController.listCases));
casesApiRouter.post('/', asyncHandler(CasesController.createCase));
casesApiRouter.get('/:id', asyncHandler(CasesController.getCaseById));
casesApiRouter.patch('/:id', asyncHandler(CasesController.updateCase));
casesApiRouter.get('/:id/audit', asyncHandler(CasesController.getCaseAudit));
casesApiRouter.get('/:id/actions', asyncHandler(CasesController.getCaseActions));
