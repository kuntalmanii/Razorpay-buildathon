/**
 * utils/asyncHandler.ts — Wraps async Express route handlers.
 *
 * Without this wrapper, unhandled promise rejections in async routes do NOT
 * reach the Express error handler — they either crash the process or are
 * silently swallowed depending on Node.js version.
 *
 * Usage:
 *   router.get('/resource', asyncHandler(async (req, res) => {
 *     const data = await someAsyncOperation();
 *     res.json(data);
 *   }));
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

/**
 * Wraps an async route handler and forwards any thrown errors to `next(err)`
 * so the global errorHandler middleware can process them.
 */
export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
