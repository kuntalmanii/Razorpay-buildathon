'use client';

import React from 'react';
import Link from 'next/link';
import { RecoveryAction, RecoveryCase } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  Bot,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AiRecommendationsProps {
  actions: RecoveryAction[];
  cases: RecoveryCase[];
}

export function AiRecommendations({
  actions,
  cases,
}: AiRecommendationsProps) {
  // Filter for AI-proposed actions or high-priority recommended actions
  const aiActions = actions
    .filter(
      (a) =>
        a.proposed_by === 'ai' ||
        a.action_type === 'create_payment_link' ||
        a.action_type === 'retry_payment'
    )
    .slice(0, 4);

  return (
    <div className="p-5 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#B89A62]/15 border border-[#B89A62]/30 flex items-center justify-center text-[#D1B982]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F2EDE3]">
              AI Strategic Recommendations
            </h2>
            <p className="text-xs text-[#817A70] mt-0.5">
              Autonomous reasoning validated against deterministic Razorpay safety policies
            </p>
          </div>
        </div>

        <Link
          href="/ai-decisions"
          className="text-xs font-mono text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          All decisions <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Empty State */}
      {aiActions.length === 0 ? (
        <div className="py-8 px-4 rounded-lg bg-[#151513]/60 border border-[rgba(242,237,227,0.06)] text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#B89A62]/15 border border-[#B89A62]/30 flex items-center justify-center mx-auto text-[#D1B982]">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-[#F2EDE3]">
            No pending AI recommendations
          </h3>
          <p className="text-[11px] text-[#817A70] max-w-md mx-auto">
            The autonomous decision engine has resolved all incoming telemetry. New recommendations will appear when complex failure patterns are identified.
          </p>
        </div>
      ) : (
        /* Recommendations List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiActions.map((action) => {
            const relatedCase = cases.find((c) => c.case_id === action.case_id);
            const payload = (action.payload || {}) as Record<string, unknown>;

            // Format category and context
            const category = relatedCase?.failure_category
              ? relatedCase.failure_category.replace(/_/g, ' ')
              : 'payment failure';

            // Extract real signals from backend
            const recoveryProb = relatedCase?.recovery_probability
              ? Math.round(Number(relatedCase.recovery_probability) * 100)
              : null;
            const riskScore = relatedCase?.risk_score
              ? Number(relatedCase.risk_score)
              : null;

            const reasonText =
              (payload.reason as string) ||
              action.failure_reason ||
              (payload.description as string) ||
              'Optimal recovery strategy selected based on failure telemetry and customer history.';

            return (
              <div
                key={action.action_id}
                className="p-4 rounded-lg bg-[#151513] border border-[rgba(242,237,227,0.08)] hover:border-[rgba(242,237,227,0.18)] transition-colors space-y-3 flex flex-col justify-between"
              >
                {/* Header: Action Title & Badges */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#D1B982] bg-[#B89A62]/10 border border-[#B89A62]/25 px-2 py-0.5 rounded">
                      {action.action_type.replace(/_/g, ' ')}
                    </span>
                    <Link
                      href={`/recovery-cases/${action.case_id}`}
                      className="font-mono text-[11px] text-[#817A70] hover:text-[#D1B982] transition-colors"
                    >
                      Case #{action.case_id.slice(-6).toUpperCase()}
                    </Link>
                  </div>

                  {/* What happened */}
                  <div className="mt-2.5">
                    <span className="text-[10px] font-mono text-[#817A70] uppercase">
                      What happened:
                    </span>
                    <p className="text-xs text-[#F2EDE3] font-medium mt-0.5 capitalize">
                      {category} on{' '}
                      {relatedCase?.customer_name || 'Customer payment'}
                    </p>
                  </div>

                  {/* Why / Reasoning */}
                  <div className="mt-2">
                    <span className="text-[10px] font-mono text-[#817A70] uppercase">
                      Why:
                    </span>
                    <p className="text-xs text-[#B7B0A3] leading-relaxed mt-0.5">
                      {reasonText}
                    </p>
                  </div>
                </div>

                {/* Footer: Supporting Signals */}
                <div className="pt-2 border-t border-[rgba(242,237,227,0.06)] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    {recoveryProb !== null && (
                      <span className="font-mono text-[10px] text-[#6F9B7A] bg-[#6F9B7A]/10 border border-[#6F9B7A]/20 px-1.5 py-0.5 rounded">
                        {recoveryProb}% recovery probability
                      </span>
                    )}
                    {riskScore !== null && (
                      <span className="font-mono text-[10px] text-[#B7B0A3] bg-[#24221E] px-1.5 py-0.5 rounded">
                        Risk {riskScore}/100
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/recovery-cases/${action.case_id}`}
                    className="font-mono text-[10px] text-[#D1B982] hover:underline flex items-center gap-0.5"
                  >
                    View details &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
