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
   * Supports both object-based options and positional parameters.
   */
  public async createRecoveryPaymentLink(
    optionsOrCaseId: CreateRecoveryLinkOptions | string,
    amountPaise?: number,
    customer?: { name?: string; email?: string; contact?: string },
    options?: { description?: string; expireInHours?: number }
  ): Promise<RazorpayPaymentLink> {
    let caseId: string;
    let amount: number;
    let currency = 'INR';
    let customerName: string | undefined;
    let customerEmail: string | undefined;
    let customerContact: string | undefined;
    let description: string | undefined;
    let expiryHours = 48;

    if (typeof optionsOrCaseId === 'object') {
      caseId = optionsOrCaseId.caseId;
      amount = optionsOrCaseId.amountPaise;
      currency = optionsOrCaseId.currency || 'INR';
      customerName = optionsOrCaseId.customerName;
      customerEmail = optionsOrCaseId.customerEmail;
      customerContact = optionsOrCaseId.customerContact;
      description = optionsOrCaseId.description;
      expiryHours = optionsOrCaseId.expiryHours ?? 48;
    } else {
      caseId = optionsOrCaseId;
      amount = amountPaise!;
      customerName = customer?.name;
      customerEmail = customer?.email;
      customerContact = customer?.contact;
      description = options?.description;
      expiryHours = options?.expireInHours ?? 48;
    }

    if (!caseId || caseId.trim().length === 0) {
      throw new ValidationError('Case ID is required for recovery payment link');
    }

    const expireByUnix = Math.floor(Date.now() / 1000) + expiryHours * 3600;

    return this.createPaymentLink({
      amount,
      currency,
      accept_partial: false,
      reference_id: `recov_${caseId.slice(0, 30)}`,
      description: description || `Payment recovery for Case #${caseId}`,
      expire_by: expireByUnix,
      reminder_enable: true,
      customer: {
        name: customerName,
        email: customerEmail,
        contact: customerContact,
      },
      notify: {
        email: Boolean(customerEmail),
        sms: Boolean(customerContact),
      },
      notes: {
        case_id: caseId,
        source: 'recoveriq_recovery_agent',
      },
    });
  }
}

export const razorpayPaymentLinkService = new RazorpayPaymentLinkService();
export const paymentLinkService = razorpayPaymentLinkService;
