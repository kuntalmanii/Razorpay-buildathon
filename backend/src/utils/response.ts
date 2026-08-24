/**
 * utils/response.ts — Typed API response helpers.
 *
 * All controllers use these helpers to ensure every response
 * conforms to the standard envelope format.
 */

import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse, PaginationMeta } from '../types/api';

/**
 * Send a successful API response.
 * @param res    Express response object
 * @param data   Payload to include under `data`
 * @param status HTTP status code (default 200)
 * @param meta   Optional pagination metadata
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status = 200,
  meta?: PaginationMeta
): void {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (meta) body.meta = meta;
  res.status(status).json(body);
}

/**
 * Send an error API response.
 * Prefer throwing AppError subclasses and letting the errorHandler call this —
 * use directly only when you need fine-grained control.
 */
export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  requestId: string,
  fields?: Record<string, string>
): void {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message, requestId, ...(fields ? { fields } : {}) },
  };
  res.status(status).json(body);
}

/**
 * Build a PaginationMeta object from raw query results.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}
