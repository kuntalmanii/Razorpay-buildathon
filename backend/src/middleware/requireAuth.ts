/**
 * middleware/requireAuth.ts
 *
 * Guards a route to require a valid authenticated session.
 * Must be used AFTER jwtAuth middleware has run.
 *
 * Throws UnauthorizedError if req.user is not populated.
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../utils/errors';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required. Please log in.');
  }
  next();
}
