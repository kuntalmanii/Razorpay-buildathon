/**
 * services/razorpay/payment.service.ts
 *
 * Typed service for querying Razorpay Payments in TEST MODE.
 * Read-only / Query operations only — no direct money collection assumptions.
 */

import { getRazorpayClient, RazorpayClient } from './razorpay.client';
import { RazorpayPayment, RazorpayCardDetails } from './razorpay.types';
import { ValidationError } from '../../utils/errors';

export class RazorpayPaymentService {
  constructor(private readonly client: RazorpayClient = getRazorpayClient()) {}

  /**
   * Fetch a payment by its Razorpay Payment ID (e.g. `pay_xxx`).
   */
  public async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new ValidationError('Payment ID is required');
    }

    return this.client.request<RazorpayPayment>({
      method: 'GET',
      path: `/payments/${encodeURIComponent(paymentId.trim())}`,
    });
  }

  /**
   * Fetch card details for a payment (if payment was made via card).
   */
  public async fetchPaymentCard(paymentId: string): Promise<RazorpayCardDetails | null> {
    if (!paymentId || paymentId.trim().length === 0) {
      throw new ValidationError('Payment ID is required');
    }

    try {
      return await this.client.request<RazorpayCardDetails>({
        method: 'GET',
        path: `/payments/${encodeURIComponent(paymentId.trim())}/card`,
      });
    } catch {
      return null;
    }
  }

  /**
   * Fetch all payment attempts associated with a Razorpay Order.
   */
  public async fetchPaymentsForOrder(orderId: string): Promise<RazorpayPayment[]> {
    if (!orderId || orderId.trim().length === 0) {
      throw new ValidationError('Order ID is required');
    }

    interface OrderPaymentsResponse {
      entity: 'collection';
      count: number;
      items: RazorpayPayment[];
    }

    const response = await this.client.request<OrderPaymentsResponse>({
      method: 'GET',
      path: `/orders/${encodeURIComponent(orderId.trim())}/payments`,
    });

    return response.items || [];
  }
}

export const razorpayPaymentService = new RazorpayPaymentService();
export const paymentService = razorpayPaymentService;
