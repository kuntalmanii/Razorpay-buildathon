/**
 * routes/api/index.ts — Master router for all /api endpoints.
 *
 * Auth architecture:
 *  1. jwtAuth runs on ALL routes — populates req.user if a valid JWT is present
 *  2. /api/auth/* is mounted FIRST and is NOT protected by requireAuth (public)
 *  3. All other routes use requireAuth to enforce authentication
 *  4. Webhook ingestion is exempt via jwtAuth internals (HMAC-verified separately)
 *  5. apiAuthMiddleware is retained as a secondary fallback for machine-to-machine clients
 */

import { Router } from 'express';
import { healthApiRouter } from './health';
import { dashboardApiRouter } from './dashboard';
import { casesApiRouter } from './cases';
import { actionsApiRouter } from './actions';
import { metricsApiRouter } from './metrics';
import { webhooksApiRouter } from './webhooks';
import { evaluationApiRouter } from './evaluation';
import { authApiRouter } from './auth';
import { usersApiRouter } from './users';
import { adminApiRouter } from './admin';
import { simulationRouter } from '../../simulation/simulation.router';
import { jwtAuth } from '../../middleware/jwtAuth';
import { requireAuth } from '../../middleware/requireAuth';

export const apiRouter = Router();

// ─── Step 1: Run JWT extraction on every request (never throws) ───────────────
apiRouter.use(jwtAuth);

// ─── Step 2: Auth routes are PUBLIC — no requireAuth before these ─────────────
apiRouter.use('/auth', authApiRouter);

// ─── Step 3: Health check — public ───────────────────────────────────────────
apiRouter.use('/health', healthApiRouter);

// ─── Step 4: Webhooks — public ingestion (HMAC protected), /events requires auth
apiRouter.use('/webhooks', webhooksApiRouter);

// ─── Step 5: All remaining routes require a valid authenticated session ────────
apiRouter.use(requireAuth);

apiRouter.use('/dashboard', dashboardApiRouter);
apiRouter.use('/recovery-cases', casesApiRouter);
apiRouter.use('/recovery-actions', actionsApiRouter);
apiRouter.use('/metrics', metricsApiRouter);
apiRouter.use('/evaluation', evaluationApiRouter);
apiRouter.use('/simulation', simulationRouter);
apiRouter.use('/users', usersApiRouter);
apiRouter.use('/admin', adminApiRouter);


