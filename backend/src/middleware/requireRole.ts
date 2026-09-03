/**
 * middleware/requireRole.ts
 *
 * Role-based authorization middleware factory.
 *
 * Usage: requireRole('admin')
 *
 * SECURITY: Role is extracted from req.user (populated by jwtAuth from JWT claims).
 * It is NEVER read from request body, query string, or headers.
 * Frontend role values are ignored at the API boundary.
 *
 * Must be used AFTER jwtAuth + requireAuth have run.
 */

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { UserRole } from '../modules/auth/auth.service';

export function requireRole(...roles: UserRole[]) {
  return function (req: Request, _res: Response, next: NextFunction): void {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`
      );
    }
    next();
  };
}
