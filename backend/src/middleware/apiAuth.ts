/**
 * middleware/apiAuth.ts
 *
 * Configurable API Key and Bearer token authorization middleware for REST API endpoints.
 * Protects administrative, case inspection, and benchmark execution endpoints.
 *
 * Security:
 *  - Uses constant-time comparison when verifying configured API keys.
 *  - Automatically passes in test/local dev mode when RECOVERIQ_API_KEY is unset.
 *  - Exempts cryptographic webhook ingress (which validates HMAC signatures).
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { UnauthorizedError } from '../utils/errors';

export function apiAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const configuredKey = config.server.apiKey;

  // In test or local dev when no key is explicitly configured, allow pass-through
  if (!configuredKey || configuredKey.trim().length === 0) {
    return next();
  }

  // Exempt webhook endpoints (they have dedicated cryptographic HMAC verification)
  if (req.path.startsWith('/webhooks/razorpay') || req.path.startsWith('/api/webhooks/razorpay')) {
    return next();
  }

  // Exempt health endpoints
  if (req.path === '/health' || req.path.startsWith('/health/') || req.path === '/api/health' || req.path.startsWith('/api/health/')) {
    return next();
  }

  // Extract key from x-api-key or Authorization header
  const headerKey = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers['authorization'];
  let bearerToken: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  const providedKey = headerKey || bearerToken;

  if (!providedKey) {
    throw new UnauthorizedError('Missing authentication credentials (provide X-API-Key or Bearer token)');
  }

  // Timing-safe constant time comparison
  const expectedBuf = Buffer.from(configuredKey, 'utf8');
  const providedBuf = Buffer.from(providedKey, 'utf8');

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    throw new UnauthorizedError('Invalid API key or authentication token');
  }

  next();
}
