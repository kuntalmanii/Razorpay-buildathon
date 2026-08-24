/**
 * services/razorpay/subscription.service.ts
 *
 * Typed service for querying Razorpay Subscriptions and related invoices in TEST MODE.
 */

import { getRazorpayClient, RazorpayClient } from './razorpay.client';
import { RazorpaySubscription, RazorpayInvoice } from './razorpay.types';
import { ValidationError } from '../../utils/errors';

export class RazorpaySubscriptionService {
  constructor(private readonly client: RazorpayClient = getRazorpayClient()) {}

  /**
   * Fetch a subscription by its Razorpay Subscription ID (e.g. `sub_xxx`).
   */
  public async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    if (!subscriptionId || subscriptionId.trim().length === 0) {
      throw new ValidationError('Subscription ID is required');
    }

    return this.client.request<RazorpaySubscription>({
      method: 'GET',
      path: `/subscriptions/${encodeURIComponent(subscriptionId.trim())}`,
    });
  }

  /**
   * Fetch all invoices generated for a subscription.
   */
  public async fetchSubscriptionInvoices(subscriptionId: string): Promise<RazorpayInvoice[]> {
    if (!subscriptionId || subscriptionId.trim().length === 0) {
      throw new ValidationError('Subscription ID is required');
    }

    interface InvoicesListResponse {
      entity: 'collection';
      count: number;
      items: RazorpayInvoice[];
    }

    const response = await this.client.request<InvoicesListResponse>({
      method: 'GET',
      path: '/invoices',
      query: {
        subscription_id: subscriptionId.trim(),
      },
    });

    return response.items || [];
  }
}

export const razorpaySubscriptionService = new RazorpaySubscriptionService();
