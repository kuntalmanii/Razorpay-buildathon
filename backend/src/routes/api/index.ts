/**
 * routes/api/index.ts — Master router for all /api endpoints.
 */

import { Router } from 'express';
import { healthApiRouter } from './health';
import { dashboardApiRouter } from './dashboard';
import { casesApiRouter } from './cases';
import { actionsApiRouter } from './actions';
import { metricsApiRouter } from './metrics';
import { webhooksApiRouter } from './webhooks';
import { evaluationApiRouter } from './evaluation';
import { simulationRouter } from '../../simulation/simulation.router';

export const apiRouter = Router();

apiRouter.use('/health', healthApiRouter);
apiRouter.use('/dashboard', dashboardApiRouter);
apiRouter.use('/recovery-cases', casesApiRouter);
apiRouter.use('/recovery-actions', actionsApiRouter);
apiRouter.use('/metrics', metricsApiRouter);
apiRouter.use('/webhooks', webhooksApiRouter);
apiRouter.use('/evaluation', evaluationApiRouter);
apiRouter.use('/simulation', simulationRouter);
