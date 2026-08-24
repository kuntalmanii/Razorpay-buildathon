/**
 * services/recovery/recovery-verifier.ts
 *
 * Authoritative verification service querying Razorpay and local DB state
 * to verify whether recovery actions succeeded and revenue was recovered.
 */

import { getPool } from '../../database/connection';
import { paymentService } from '../razorpay/payment.service';
import { paymentLinkService } from '../razorpay/payment-link.service';
import { logger } from '../../utils/logger';

export interface VerificationOutcome {
  caseId: string;
  isRecovered: boolean;
  recoveredAmount: number;
  currency: string;
  source: 'payment' | 'payment_link' | 'subscription' | 'none';
  status: string;
  details?: Record<string, unknown>;
}

export class RecoveryVerifier {
  /**
   * Authoritatively verify recovery state against Razorpay and PostgreSQL.
   */
  public static async verifyCase(caseId: string): Promise<VerificationOutcome> {
    const pool = getPool();

    // 1. Query case and linked payment / subscription / action info
    const caseRes = await pool.query<{
      case_id: string;
      merchant_id: string;
      customer_id: string | null;
      payment_id: string | null;
      subscription_id: string | null;
      amount_at_risk: string;
      currency: string;
      status: string;
      recovered_amount: string;
    }>(`
      SELECT
        case_id, merchant_id, customer_id, payment_id, subscription_id,
        amount_at_risk, currency, status, recovered_amount
      FROM revenue_risk_cases
      WHERE case_id = $1;
    `, [caseId]);

    if (caseRes.rows.length === 0) {
      return {
        caseId,
        isRecovered: false,
        recoveredAmount: 0,
        currency: 'INR',
        source: 'none',
        status: 'not_found',
      };
    }

    const c = caseRes.rows[0];
    const amountAtRisk = parseInt(c.amount_at_risk, 10);

    // If case is already marked recovered locally
    if (c.status === 'recovered') {
      return {
        caseId,
        isRecovered: true,
        recoveredAmount: parseInt(c.recovered_amount, 10) || amountAtRisk,
        currency: c.currency,
        source: 'payment',
        status: 'recovered',
      };
    }

    // 2. Check linked Razorpay Payment Link if any action issued one
    const actionsRes = await pool.query<{
      action_id: string;
      action_type: string;
      result: { paymentLinkId?: string } | null;
    }>(`
      SELECT action_id, action_type, result
      FROM recovery_actions
      WHERE case_id = $1 AND action_type = 'create_payment_link'
      ORDER BY created_at DESC
      LIMIT 1;
    `, [caseId]);

    if (actionsRes.rows.length > 0 && actionsRes.rows[0].result?.paymentLinkId) {
      const plinkId = actionsRes.rows[0].result.paymentLinkId;
      try {
        const plink = await paymentLinkService.fetchPaymentLink(plinkId);

        if (plink.status === 'paid' || (plink.amount_paid !== undefined && plink.amount_paid >= amountAtRisk)) {
          const recoveredAmount = plink.amount_paid ?? amountAtRisk;
          await this.markCaseAsRecovered(caseId, recoveredAmount, 'payment_link');
          return {
            caseId,
            isRecovered: true,
            recoveredAmount,
            currency: plink.currency,
            source: 'payment_link',
            status: 'recovered',
            details: { paymentLinkId: plinkId, status: plink.status },
          };
        }
      } catch (err) {
        logger.warn(`Could not verify payment link ${plinkId}: ${(err as Error).message}`);
      }
    }

    // 3. Check original Razorpay Payment if ID available
    if (c.payment_id) {
      const payRes = await pool.query<{ razorpay_payment_id: string | null }>(`
        SELECT razorpay_payment_id FROM payments WHERE payment_id = $1;
      `, [c.payment_id]);

      const rzpPaymentId = payRes.rows[0]?.razorpay_payment_id;
      if (rzpPaymentId) {
        try {
          const payment = await paymentService.fetchPayment(rzpPaymentId);
          if (payment.status === 'captured') {
            await this.markCaseAsRecovered(caseId, payment.amount, 'payment');
            return {
              caseId,
              isRecovered: true,
              recoveredAmount: payment.amount,
              currency: payment.currency,
              source: 'payment',
              status: 'recovered',
              details: { paymentId: rzpPaymentId, status: payment.status },
            };
          }
        } catch (err) {
          logger.warn(`Could not verify payment ${rzpPaymentId}: ${(err as Error).message}`);
        }
      }
    }

    return {
      caseId,
      isRecovered: false,
      recoveredAmount: 0,
      currency: c.currency,
      source: 'none',
      status: c.status,
    };
  }

  private static async markCaseAsRecovered(
    caseId: string,
    amount: number,
    recoverySource: string
  ): Promise<void> {
    const pool = getPool();
    await pool.query(`
      UPDATE revenue_risk_cases
      SET
        status = 'recovered',
        recovered_amount = $1,
        resolved_at = NOW(),
        recovery_reason = $2,
        updated_at = NOW()
      WHERE case_id = $3;
    `, [amount, `Recovered via ${recoverySource} verification`, caseId]);

    await pool.query(`
      UPDATE recovery_actions
      SET
        execution_status = 'completed',
        executed_at = COALESCE(executed_at, NOW()),
        updated_at = NOW()
      WHERE case_id = $1 AND execution_status IN ('scheduled', 'executing');
    `, [caseId]);

    await pool.query(`
      INSERT INTO audit_logs (
        entity_type, entity_id, action, actor_type, actor_id, after_state, metadata
      ) VALUES ('revenue_risk_cases', $1, 'recovery_verified', 'system', 'recovery_verifier', $2, $3);
    `, [
      caseId,
      JSON.stringify({ status: 'recovered', recoveredAmount: amount }),
      JSON.stringify({ source: recoverySource }),
    ]);

    logger.info(`Case ${caseId} confirmed as RECOVERED (₹${(amount / 100).toLocaleString('en-IN')})`);
  }
}
