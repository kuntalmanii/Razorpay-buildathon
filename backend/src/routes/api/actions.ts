/**
 * routes/api/actions.ts — Routes for /api/recovery-actions.
 */

import { Router } from 'express';
import { ActionsController } from '../../controllers/actionsController';
import { asyncHandler } from '../../utils/asyncHandler';

export const actionsApiRouter = Router();

actionsApiRouter.get('/', asyncHandler(ActionsController.listActions));
