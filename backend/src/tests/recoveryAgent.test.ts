import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecoveryAgent,
  MockAIProvider,
  DecisionParser,
  RecoveryDecisionSchema,
  AgentInputContext,
} from '../agents/recovery';
import { setPool } from '../database/connection';
import { Pool } from 'pg';

describe('AI Recovery Decision Agent', () => {
  let mockProvider: MockAIProvider;
  let agent: RecoveryAgent;
  let mockPool: unknown;
  let insertedDecisions: unknown[];

  const sampleContext: AgentInputContext = {
    caseId: 'case_uuid_001',
    amountPaise: 450000, // ₹4,500
    currency: 'INR',
    failureCategory: 'BANK_DECLINED',
    riskScore: 65,
    recoveryProbability: 0.70,
    riskFactors: ['Bank decline requires alternative payment method'],
    customer: {
      customerId: 'cust_uuid_001',
      name: 'Rohan Sharma',
      totalHistoricalPayments: 3,
      previousFailures: 0,
      isReliableCustomer: true,
    },
    previousRecoveryAttempts: 0,
    hoursSinceFailure: 1.5,
  };

  beforeEach(() => {
    insertedDecisions = [];
    mockProvider = new MockAIProvider();
    agent = new RecoveryAgent(mockProvider);

    mockPool = {
      query: async (sql: string, params?: unknown[]) => {
        // 1. Fetch risk case
        if (sql.includes('revenue_risk_cases') && sql.includes('case_id = $1') && sql.includes('SELECT')) {
          return {
            rows: [
              {
                case_id: 'case_uuid_001',
                merchant_id: 'merch_001',
                customer_id: 'cust_uuid_001',
                payment_id: 'pay_001',
                subscription_id: null,
                amount_at_risk: '450000',
                currency: 'INR',
                failure_category: 'bank_decline',
                risk_score: '0.6500',
                recovery_probability: '0.7000',
                detected_at: new Date(Date.now() - 3600 * 1000),
              },
            ],
          };
        }

        // 2. Customer lookup
        if (sql.includes('customers') && sql.includes('customer_id = $1')) {
          return { rows: [{ name: 'Rohan Sharma' }] };
        }

        // 3. Customer payment history
        if (sql.includes('payments') && sql.includes('customer_id = $1')) {
          return {
            rows: [
              { status: 'captured', count: 3 },
              { status: 'failed', count: 0 },
            ],
          };
        }

        // 4. Recovery actions count
        if (sql.includes('recovery_actions') && sql.includes('case_id = $1')) {
          return { rows: [{ count: 0 }] };
        }

        // 5. Audit logs for risk factors
        if (sql.includes('audit_logs') && sql.includes('entity_id = $1')) {
          return { rows: [{ metadata: { factors: ['Bank decline detected'] } }] };
        }

        // 6. Insert AI decision
        if (sql.includes('INSERT INTO ai_decisions')) {
          insertedDecisions.push(params);
          return { rows: [{ decision_id: `dec_${Date.now()}` }] };
        }

        // 7. Case state transition
        if (sql.includes('UPDATE revenue_risk_cases')) {
          return { rows: [{ case_id: 'case_uuid_001' }] };
        }

        return { rows: [] };
      },
      connect: async () => ({
        query: async (sql: string, params?: unknown[]) => (mockPool as { query: (s: string, p?: unknown[]) => Promise<unknown> }).query(sql, params),
        release: () => {},
      }),
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: () => {},
    };

    setPool(mockPool as Pool);
  });

  afterEach(() => {
    setPool(null);
  });

  describe('1. Valid AI Recommendation', () => {
    it('evaluates case and generates validated structured recommendation', async () => {
      const response = await agent.evaluateCase('case_uuid_001');

      assert.equal(response.isFallback, false);
      assert.equal(response.decision.decision, 'PAYMENT_LINK');
      assert.ok(response.decision.confidence >= 0.70);
      assert.ok(response.decision.reasoning_summary.length >= 10);
      assert.ok(response.decision.evidence.length >= 1);
      assert.ok(response.decision.customer_message.includes('Rohan Sharma'));
      assert.equal(response.decision.requires_human_approval, false);

      // Verify audit persistence
      assert.equal(insertedDecisions.length, 1);
    });
  });

  describe('2. Invalid Recommendation Handling', () => {
    it('catches schema violations and generates safe deterministic fallback', () => {
      const invalidOutput = {
        decision: 'INVALID_UNKNOWN_ACTION', // Invalid enum
        confidence: 2.5, // Out of bounds
        reasoning_summary: 'Too short',
      };

      const result = DecisionParser.parseAndValidate(invalidOutput, sampleContext);

      assert.equal(result.isValid, false);
      assert.equal(result.isFallback, true);
      assert.ok(result.validationError);
      assert.ok(['PAYMENT_LINK', 'ESCALATE', 'RETRY'].includes(result.decision.decision));
      assert.ok(result.decision.risk_flags.includes('FALLBACK_RULE_APPLIED'));
    });

    it('catches malformed raw text / non-JSON and generates safe fallback', () => {
      const rawMalformed = 'I recommend sending a payment link to the user immediately!';

      const result = DecisionParser.parseAndValidate(rawMalformed, sampleContext);

      assert.equal(result.isValid, false);
      assert.equal(result.isFallback, true);
      assert.ok(result.decision.reasoning_summary.includes('Deterministic Fallback'));
    });
  });

  describe('3. Low Confidence Guard', () => {
    it('flags low confidence predictions and enforces human approval', () => {
      const lowConfidenceOutput = {
        decision: 'PAYMENT_LINK',
        confidence: 0.45, // Below 0.65 threshold
        reasoning_summary: 'Uncertain about customer payment intent on this channel.',
        evidence: ['Transaction has limited historical signal'],
        customer_message: 'Please complete your payment.',
        risk_flags: [],
        requires_human_approval: false,
      };

      const result = DecisionParser.parseAndValidate(lowConfidenceOutput, sampleContext);

      assert.equal(result.isValid, true);
      assert.equal(result.decision.requires_human_approval, true);
      assert.ok(result.decision.risk_flags.includes('LOW_MODEL_CONFIDENCE'));
      assert.ok(result.decision.reasoning_summary.includes('[Low Confidence 0.45]'));
    });
  });

  describe('4. AI Timeout Handling', () => {
    it('applies safe deterministic fallback on AI timeout without crashing', async () => {
      mockProvider.simulatedTimeoutMs = 15000; // Triggers timeout > 10000ms

      const response = await agent.evaluateCase('case_uuid_001');

      assert.equal(response.isFallback, true);
      assert.ok(response.decision.reasoning_summary.includes('Deterministic Fallback'));
      assert.ok(insertedDecisions.length === 1, 'Decision record must be persisted even on fallback');
    });
  });

  describe('5. AI Unavailable / Service Error', () => {
    it('applies safe deterministic fallback when AI provider throws connection error', async () => {
      mockProvider.simulatedError = new Error('503 Service Unavailable: Rate limit exceeded');

      const response = await agent.evaluateCase('case_uuid_001');

      assert.equal(response.isFallback, true);
      assert.ok(response.decision.risk_flags.includes('FALLBACK_RULE_APPLIED'));
      assert.ok(response.decision.reasoning_summary.includes('Rate limit exceeded'));
    });
  });

  describe('6. Unsafe Recommendation Prevention', () => {
    it('caps excessive automated retries (>= 3 attempts) and escalates for human review', () => {
      const contextWithRetries: AgentInputContext = {
        ...sampleContext,
        previousRecoveryAttempts: 3,
      };

      const retryRecommendation = {
        decision: 'RETRY',
        confidence: 0.85,
        reasoning_summary: 'Retry again through the gateway switch.',
        evidence: ['Previous attempts were network errors'],
        customer_message: '',
        risk_flags: [],
        requires_human_approval: false,
      };

      const result = DecisionParser.parseAndValidate(retryRecommendation, contextWithRetries);

      assert.equal(result.isValid, true);
      assert.equal(result.decision.decision, 'ESCALATE');
      assert.equal(result.decision.requires_human_approval, true);
      assert.ok(result.decision.risk_flags.includes('MAX_RETRIES_EXCEEDED'));
    });

    it('requires human approval for high-value enterprise transactions (> ₹50,000)', () => {
      const enterpriseContext: AgentInputContext = {
        ...sampleContext,
        amountPaise: 8000000, // ₹80,000
      };

      const enterpriseRec = {
        decision: 'PAYMENT_LINK',
        confidence: 0.85,
        reasoning_summary: 'Generate payment link for large invoice.',
        evidence: ['Enterprise renewal'],
        customer_message: 'Please review invoice and complete payment.',
        risk_flags: [],
        requires_human_approval: false,
      };

      const result = DecisionParser.parseAndValidate(enterpriseRec, enterpriseContext);

      assert.equal(result.decision.requires_human_approval, true);
      assert.ok(result.decision.risk_flags.includes('ENTERPRISE_HIGH_VALUE_TRANSACTION'));
    });
  });

  describe('7. Missing Customer Context Graceful Handling', () => {
    it('handles null customer information gracefully with safe defaults', () => {
      const anonymousContext: AgentInputContext = {
        ...sampleContext,
        customer: {
          customerId: undefined,
          name: undefined,
          totalHistoricalPayments: 0,
          previousFailures: 0,
          isReliableCustomer: false,
        },
      };

      const fallback = DecisionParser.createFallbackDecision(anonymousContext, 'Anonymous customer context');

      assert.ok(fallback.decision);
      assert.ok(fallback.customer_message.includes('Hi there'));
      assert.ok(RecoveryDecisionSchema.safeParse(fallback).success);
    });
  });

  describe('8. Zero Razorpay Direct Execution Guarantee', () => {
    it('verifies AI agent output contains only recommendations and no execution capabilities', async () => {
      const response = await agent.evaluateCase('case_uuid_001');

      // The AI response is strictly a recommendation object
      assert.ok('decision' in response.decision);
      assert.ok('confidence' in response.decision);
      assert.ok('reasoning_summary' in response.decision);
      assert.ok('requires_human_approval' in response.decision);

      // AI response cannot contain execution handles, tokens, or executable API methods
      assert.equal((response.decision as Record<string, unknown>).execute, undefined);
      assert.equal((response.decision as Record<string, unknown>).razorpay_client, undefined);
      assert.equal((response.decision as Record<string, unknown>).api_key, undefined);
    });
  });
});
