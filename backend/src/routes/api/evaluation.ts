/**
 * routes/api/evaluation.ts — Routes for /api/evaluation.
 */

import { Router } from 'express';
import { EvaluationController } from '../../controllers/evaluationController';
import { asyncHandler } from '../../utils/asyncHandler';

export const evaluationApiRouter = Router();

evaluationApiRouter.get('/', asyncHandler(EvaluationController.getEvaluation));
evaluationApiRouter.post('/run', asyncHandler(EvaluationController.runEvaluation));
