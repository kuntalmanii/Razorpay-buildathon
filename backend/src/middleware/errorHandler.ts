/**
 * middleware/errorHandler.ts — Global Express error handler.
 *
 * Must be mounted LAST — after all routes and other middleware.
 * Formats all errors into the standard API error response envelope:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "...",
 *     "message": "...",
 *     "requestId": "...",
 *     "fields": {} // optional
 *   }
 * }
 *
 * Internal error details (DB credentials, stack traces, internal paths) are never exposed.
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ApiErrorResponse } from '../types/api';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId || 'unknown';

  // Operational errors — known, expected errors with status codes
  if (err instanceof AppError) {
    const fields = 'fields' in err ? (err as AppError & { fields?: Record<string, string> }).fields : undefined;

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.name,
        message: err.message,
        requestId,
        ...(fields ? { fields } : {}),
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Unexpected errors — log full details server-side, return safe 500
  logger.error('Unhandled server error', {
    requestId,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      requestId,
    },
  };

  res.status(500).json(response);
}
