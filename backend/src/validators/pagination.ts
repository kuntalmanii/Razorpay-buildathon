/**
 * validators/pagination.ts — Validates and parses standard pagination query params.
 *
 * Usage:
 *   const { page, limit, error } = parsePagination(req.query);
 *   if (error) throw error;
 */

import { ValidationError } from '../utils/errors';

export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
  error?: never;
}

export interface PaginationParseError {
  error: ValidationError;
}

export function parsePagination(
  query: Record<string, unknown>
): ParsedPagination | PaginationParseError {
  const errors: Record<string, string> = {};
  let page = 1;
  let limit = 20;

  if (query.page !== undefined) {
    const raw = parseInt(query.page as string, 10);
    if (isNaN(raw) || raw < 1) {
      errors.page = 'Must be a positive integer';
    } else {
      page = raw;
    }
  }

  if (query.limit !== undefined) {
    const raw = parseInt(query.limit as string, 10);
    if (isNaN(raw) || raw < 1 || raw > 100) {
      errors.limit = 'Must be an integer between 1 and 100';
    } else {
      limit = raw;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { error: new ValidationError('Invalid pagination parameters', errors) };
  }

  return { page, limit, offset: (page - 1) * limit };
}
