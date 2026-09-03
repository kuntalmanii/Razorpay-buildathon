/**
 * middleware/jwtAuth.ts
 *
 * JWT authentication middleware.
 *
 * Strategy:
 *  1. Check for JWT in the 'recoveriq_token' httpOnly cookie (browser clients)
 *  2. Fall back to 'Authorization: Bearer <token>' header (API/mobile clients)
 *  3. If a valid token is found, attaches req.user = { userId, email, role }
 *  4. If no token is found, req.user remains undefined (routes decide if auth required)
 *
 * Webhook exemption is PRESERVED — /api/webhooks/razorpay bypasses token check.
 * Health endpoints remain publicly accessible.
 *
 * This middleware NEVER throws on missing token — use requireAuth for enforcement.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { logger } from '../utils/logger';

const COOKIE_NAME = 'recoveriq_token';

export function jwtAuth(req: Request, _res: Response, next: NextFunction): void {
  // Preserve webhook exemption — HMAC validates these separately
  if (
    req.path.startsWith('/webhooks/razorpay') ||
    req.path.startsWith('/api/webhooks/razorpay')
  ) {
    return next();
  }

  // 1. Try httpOnly cookie first
  let token: string | undefined = req.cookies?.[COOKIE_NAME];

  // 2. Fall back to Bearer token in Authorization header
  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    // No token present — pass through (requireAuth will enforce if needed)
    return next();
  }

  try {
    const payload = AuthService.verifyToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    // Invalid/expired token — clear it silently, do not throw
    // requireAuth will handle enforcement
    logger.debug('jwtAuth: Invalid token received, clearing');
  }

  next();
}
