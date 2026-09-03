/**
 * routes/api/users.ts
 *
 * Admin-only user management routes.
 * Strictly protected by requireRole('admin').
 */

import { Router } from 'express';
import { UsersController } from '../../modules/users/users.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import { requireRole } from '../../middleware/requireRole';

export const usersApiRouter = Router();

// Enforce admin-only access for all /api/users routes
usersApiRouter.use(requireRole('admin'));

usersApiRouter.get('/', asyncHandler(UsersController.list));
usersApiRouter.get('/:id', asyncHandler(UsersController.getById));
