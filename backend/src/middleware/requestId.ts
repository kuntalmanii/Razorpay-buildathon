/**
 * middleware/requestId.ts — Attaches a unique UUID to every incoming request.
 *
 * The ID is:
 *  - Attached to `req.requestId` (accessible in all downstream handlers)
 *  - Sent as the `X-Request-ID` response header
 *
 * The errorHandler reads `req.requestId` to include it in every error response,
 * making errors traceable in logs without exposing internal details.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Honour an upstream request ID if provided (e.g. by a load balancer or API gateway)
  const incomingId = req.headers['x-request-id'];
  req.requestId =
    typeof incomingId === 'string' && incomingId.trim().length > 0
      ? incomingId.trim()
      : randomUUID();

  // Echo the ID in the response so clients can correlate request ↔ response
  res.setHeader('X-Request-ID', req.requestId);
  next();
}
