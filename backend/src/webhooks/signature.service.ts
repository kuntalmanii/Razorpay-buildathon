/**
 * webhooks/signature.service.ts
 *
 * HMAC-SHA256 cryptographic signature validation for Razorpay webhooks.
 *
 * Security:
 *  - Uses crypto.timingSafeEqual to defend against timing side-channel attacks.
 *  - Never logs or exposes the webhook secret.
 *  - Rejects unverified payloads before any business logic is executed.
 */

import crypto from 'crypto';
import { config } from '../config';
import { logger } from '../utils/logger';

export class SignatureService {
  /**
   * Validate incoming Razorpay webhook signature.
   *
   * @param rawBody   The exact, unparsed request body string (UTF-8)
   * @param signature The `x-razorpay-signature` header from Razorpay
   * @param secret    Optional secret override (defaults to config.razorpay.webhookSecret)
   */
  public static validateSignature(
    rawBody: string,
    signature?: string,
    secret?: string
  ): boolean {
    const webhookSecret = secret || config.razorpay.webhookSecret;

    if (!webhookSecret || webhookSecret.trim().length === 0) {
      logger.error('Webhook signature validation failed: RAZORPAY_WEBHOOK_SECRET is not configured');
      return false;
    }

    if (!signature || signature.trim().length === 0) {
      logger.warn('Webhook signature validation failed: x-razorpay-signature header missing or empty');
      return false;
    }

    if (!rawBody || rawBody.length === 0) {
      logger.warn('Webhook signature validation failed: raw request body is empty');
      return false;
    }

    try {
      const expectedSignature = this.generateSignature(rawBody, webhookSecret);

      const signatureBuffer = Buffer.from(signature.trim(), 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      // Buffers must have identical length for timingSafeEqual
      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (err) {
      logger.error('Error during webhook HMAC calculation', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Compute HMAC-SHA256 hex digest for a raw body payload.
   */
  public static generateSignature(rawBody: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  }
}
