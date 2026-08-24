/**
 * types/api.ts — API response envelope types.
 *
 * All API endpoints use one of these two shapes so clients
 * can discriminate on `success` without inspecting status codes.
 */

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  requestId: string;
  /** Field-level validation errors, present only on ValidationError */
  fields?: Record<string, string>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
