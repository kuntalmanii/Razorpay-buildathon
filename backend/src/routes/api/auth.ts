/**
 * routes/api/auth.ts
 *
 * Mounts all /api/auth/* endpoints.
 * Register and login are UNAUTHENTICATED (no jwtAuth middleware applied here).
 * /me requires authentication — enforced via requireAuth in the route definition.
 */

import { Router } from 'express';
import { AuthController } from '../../modules/auth/auth.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireAuth } from '../../middleware/requireAuth';

export const authApiRouter = Router();

// Public routes (no auth required)
authApiRouter.post('/register', asyncHandler(AuthController.register));
authApiRouter.post('/login', asyncHandler(AuthController.login));
authApiRouter.post('/logout', asyncHandler(AuthController.logout));

// Protected — must be authenticated
authApiRouter.get('/me', requireAuth, asyncHandler(AuthController.me));
