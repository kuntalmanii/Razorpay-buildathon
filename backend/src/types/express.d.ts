/**
 * types/express.d.ts — Express Request type augmentation.
 *
 * Extends Express's Request interface to include `requestId` injected by
 * the requestId middleware. TypeScript will recognise req.requestId as
 * a string on every request handler.
 */

declare global {
  namespace Express {
    interface Request {
      /** UUID v4 generated per request by the requestId middleware */
      requestId: string;
    }
  }
}

export {};
