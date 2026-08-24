/**
 * types/express.d.ts — Express Request type augmentation.
 *
 * Extends Express's Request interface to include:
 *  - `requestId` injected by the requestId middleware
 *  - `rawBody` captured by express.json({ verify }) for HMAC webhook signature verification
 */

declare global {
  namespace Express {
    interface Request {
      /** UUID v4 generated per request by the requestId middleware */
      requestId: string;
      /** Pristine raw body buffer string for HMAC signature verification */
      rawBody?: string;
    }
  }
}

export {};
