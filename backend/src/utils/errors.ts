/**
 * utils/errors.ts — Typed application error hierarchy.
 *
 * AppError is the base class for all intentional, catchable errors.
 * Subclasses map to specific HTTP status codes.
 * The global errorHandler middleware uses `instanceof AppError` to decide
 * how to respond — anything else is treated as an unexpected 500.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 400 — caller sent invalid data */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 400);
    this.fields = fields;
  }
}

/** 401 — no valid credentials */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

/** 403 — authenticated but not allowed */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/** 404 — resource not found */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/** 409 — conflict (e.g. duplicate idempotency key) */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** 422 — request understood but semantically invalid */
export class UnprocessableError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

/** 429 — rate limit exceeded */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

/** 503 — dependency unavailable (e.g. DB not connected) */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
  }
}
