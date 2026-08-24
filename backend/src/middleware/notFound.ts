/**
 * middleware/notFound.ts — 404 catch-all handler.
 *
 * Mounted after all routes. Creates a NotFoundError and forwards it to the
 * global errorHandler so the response format is consistent.
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../utils/errors';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}
