/**
 * services/razorpay/payment-link.service.ts
 *
 * Typed service for creating, querying, and cancelling Razorpay Payment Links in TEST MODE.
 * Payment Links are the designated recovery payment mechanism for failed payments & unpaid invoices.
 */

import { getRazorpayClient, RazorpayClient } from './razorpay.client';
import {
  RazorpayPaymentLink,
  CreatePaymentLinkParams,
} from './razorpay.types';
import { ValidationError } from '../../utils/errors';

export interface CreateRecoveryLinkOptions {
  caseId: string;
  amountPaise: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  description?: string;
  expiryHours?: number;
  notifySms?: boolean;
  notifyEmail?: boolean;
  notes?: Record<string, string>;
}

export class RazorpayPaymentLinkService {
  constructor(private readonly client: RazorpayClient = getRazorpayClient()) {}

  /**
   * Create a standard Razorpay Payment Link (`POST /v1/payment_links`).
   */
  public async createPaymentLink(params: CreatePaymentLinkParams): Promise<RazorpayPaymentLink> {
    if (!params.amount || params.amount <= 0 || !Number.isInteger(params.amount)) {
      throw new ValidationError('Amount must be a positive integer in paise (smallest currency unit)');
    }

    const payload: Record<string, unknown> = {
      amount: params.amount,
      currency: params.currency || 'INR',
      accept_partial: Boolean(params.accept_partial),
      description: params.description || 'RecoverIQ Payment Recovery',
      reminder_enable: params.reminder_enable ?? true,
    };

    if (params.first_min_partial_amount) {
      payload.first_min_partial_amount = params.first_min_partial_amount;
    }

    if (params.expire_by) {
      payload.expire_by = params.expire_by;
    }

    if (params.reference_id) {
      payload.reference_id = params.reference_id;
    }

    if (params.customer && (params.customer.name || params.customer.email || params.customer.contact)) {
      payload.customer = {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.contact,
      };
    }

    if (params.notify) {
      payload.notify = {
        sms: Boolean(params.notify.sms),
        email: Boolean(params.notify.email),
        whatsapp: Boolean(params.notify.whatsapp),
      };
    }

    if (params.notes) {
      payload.notes = params.notes;
    }

    return this.client.request<RazorpayPaymentLink>({
      method: 'POST',
      path: '/payment_links',
      body: payload,
    });
  }

  /**
   * Fetch a payment link by its ID (`GET /v1/payment_links/{id}`).
   */
  public async fetchPaymentLink(linkId: string): Promise<RazorpayPaymentLink> {
    if (!linkId || linkId.trim().length === 0) {
      throw new ValidationError('Payment Link ID is required');
    }

    return this.client.request<RazorpayPaymentLink>({
      method: 'GET',
      path: `/payment_links/${encodeURIComponent(linkId.trim())}`,
    });
  }

  /**
   * Cancel an unpaid payment link (`POST /v1/payment_links/{id}/cancel`).
   */
  public async cancelPaymentLink(linkId: string): Promise<RazorpayPaymentLink> {
    if (!linkId || linkId.trim().length === 0) {
      throw new ValidationError('Payment Link ID is required');
    }

    return this.client.request<RazorpayPaymentLink>({
      method: 'POST',
      path: `/payment_links/${encodeURIComponent(linkId.trim())}/cancel`,
    });
  }

  /**
   * High-level recovery action: creates a tailored Payment Link for a recovery case.
   */
  public async createRecoveryPaymentLink(options: CreateRecoveryLinkOptions): Promise<RazorpayPaymentLink> {
    if (!options.caseId || options.caseId.trim().length === 0) {
      throw new ValidationError('Case ID is required for recovery payment link');
    }

    const expiryHours = options.expiryHours ?? 48;
    const expireByUnix = Math.floor(Date.now() / 1000) + expiryHours * 3600;

    return this.createPaymentLink({
      amount: options.amountPaise,
      currency: options.currency || 'INR',
      accept_partial: false,
      reference_id: `recov_${options.caseId.slice(0, 30)}`,
      description: options.description || `Payment recovery for Case #${options.caseId}`,
      expire_by: expireByUnix,
      reminder_enable: true,
      customer: {
        name: options.customerName,
        email: options.customerEmail,
        contact: options.customerContact,
      },
      notify: {
        email: options.notifyEmail ?? Boolean(options.customerEmail),
        sms: options.notifySms ?? Boolean(options.customerContact),
      },
      notes: {
        case_id: options.caseId,
        source: 'recoveriq_recovery_agent',
        ...(options.notes || {}),
      },
    });
  }
}

export const razorpayPaymentLinkService = new RazorpayPaymentLinkService();
