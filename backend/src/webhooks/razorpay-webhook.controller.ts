/**
 * webhooks/razorpay-webhook.controller.ts
 *
 * Express controller for receiving Razorpay webhooks and local dev simulation.
 */

import { Request, Response } from 'express';
import { razorpayWebhookService } from './razorpay-webhook.service';
import { SignatureService } from './signature.service';
import { sendSuccess } from '../utils/response';
import { ForbiddenError, ValidationError } from '../utils/errors';
import { config } from '../config';

export class RazorpayWebhookController {
  /**
   * POST /api/webhooks/razorpay
   * Main production endpoint for incoming Razorpay webhook delivery.
   */
  public static async handleWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const eventId = req.headers['x-razorpay-event-id'] as string | undefined;

    const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

    const result = await razorpayWebhookService.ingestWebhook({
      rawBody,
      signature,
      eventId,
      payload: req.body,
    });

    sendSuccess(res, result, 200);
  }

  /**
   * POST /api/webhooks/razorpay/simulate
   * Dev-only simulation endpoint. Explicitly disabled in production.
   */
  public static async simulateWebhook(req: Request, res: Response): Promise<void> {
    if (config.server.isProduction) {
      throw new ForbiddenError('Webhook simulation endpoint is strictly disabled in production');
    }

    if (!req.body || typeof req.body !== 'object') {
      throw new ValidationError('Simulation payload must be a valid JSON object');
    }

    const payload = req.body as Record<string, unknown>;
    const rawBody = JSON.stringify(payload);
    const secret = config.razorpay.webhookSecret || 'simulated_dev_webhook_secret_123';

    const signature = SignatureService.generateSignature(rawBody, secret);
    const eventId = (req.headers['x-razorpay-event-id'] as string) || `sim_evt_${Date.now()}`;

    // Temporarily validate against the simulation secret
    const isValid = SignatureService.validateSignature(rawBody, signature, secret);
    if (!isValid) {
      throw new ValidationError('Failed to generate valid simulated signature');
    }

    const result = await razorpayWebhookService.ingestWebhook({
      rawBody,
      signature: SignatureService.generateSignature(rawBody, config.razorpay.webhookSecret || secret),
      eventId,
      payload,
    });

    sendSuccess(res, {
      simulation: true,
      result,
    });
  }
}
