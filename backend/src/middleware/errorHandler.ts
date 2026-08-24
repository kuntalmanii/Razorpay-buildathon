/**
 * middleware/errorHandler.ts — Global Express error handler.
 *
 * Must be mounted LAST — after all routes and other middleware.
 * Express identifies error-handling middleware by its 4-argument signature.
 *
 * - AppError instances (operational errors) → return appropriate HTTP status + JSON
 * - Unknown errors → log stack trace + return 500 (details hidden in production)
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    fields?: Record<string, string>;
    stack?: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Operational errors — known, expected errors we threw intentionally
  if (err instanceof AppError) {
    const body: ErrorResponse = {
      error: {
        message: err.message,
        code: err.name,
        // Include field-level validation errors if present
        ...('fields' in err && { fields: (err as AppError & { fields?: Record<string, string> }).fields }),
      },
    };

    if (!config.server.isProduction) {
      body.error.stack = err.stack;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Unexpected errors — log full details, return generic 500
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  const body: ErrorResponse = {
    error: {
      message: config.server.isProduction
        ? 'An unexpected error occurred'
        : err.message,
      code: 'InternalServerError',
      ...(!config.server.isProduction && { stack: err.stack }),
    },
  };

  res.status(500).json(body);
}
