/**
 * types/express.d.ts — Express Request type augmentation.
 *
 * Extends Express's Request interface to include:
 *  - `requestId` injected by the requestId middleware
 *  - `rawBody` captured by express.json({ verify }) for HMAC webhook signature verification
 *  - `user` injected by jwtAuth middleware after successful JWT verification
 */

import { UserRole } from '../modules/auth/auth.service';

declare global {
  namespace Express {
    interface Request {
      /** UUID v4 generated per request by the requestId middleware */
      requestId: string;
      /** Pristine raw body buffer string for HMAC signature verification */
      rawBody?: string;
      /**
       * Authenticated user identity — populated by jwtAuth middleware.
       * Only present on routes where a valid JWT was provided.
       * Role is sourced exclusively from JWT claims — never from request data.
       */
      user?: {
        userId: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export {};
