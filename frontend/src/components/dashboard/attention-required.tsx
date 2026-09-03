'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RecoveryCase, RecoveryAction } from '@/types/api';
import { formatINR, formatDate } from '@/lib/utils';
import {
  ArrowUpRight,
  RotateCw,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AttentionRequiredProps {
  cases: RecoveryCase[];
  actions: RecoveryAction[];
  onRetryCase: (caseId: string) => Promise<void>;
}

export function AttentionRequired({
  cases,
  actions,
  onRetryCase,
}: AttentionRequiredProps) {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retriedIds, setRetriedIds] = useState<Record<string, boolean>>({});

  // Filter cases requiring attention
  const attentionCases = cases.filter((c) => {
    const isResolved = c.status === 'recovered' || c.status === 'closed';
    if (isResolved) return false;

    const riskScore = Number(c.risk_score || 0);
    const amount = Number(c.amount_at_risk || 0);
    const caseActions = actions.filter((a) => a.case_id === c.case_id);
    const hasFailedAction = caseActions.some((a) => a.execution_status === 'failed');
    const isBlocked = caseActions.some((a) => a.policy_status === 'rejected');

    // 1. Blocked or failed attempts
    if (hasFailedAction || isBlocked || c.status === 'unrecoverable') return true;

    // 2. High risk or high value
    if (riskScore >= 65 || amount >= 200000) return true;

    // 3. Open cases needing review
    if (c.status === 'open') return true;

    return false;
  });

  const handleRetry = async (caseId: string) => {
    setRetryingId(caseId);
    try {
      await onRetryCase(caseId);
      setRetriedIds((prev) => ({ ...prev, [caseId]: true }));
    } catch {
      setRetriedIds((prev) => ({ ...prev, [caseId]: true }));
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="p-5 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#F2EDE3]">
              Attention Required
            </h2>
            {attentionCases.length > 0 && (
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#B56F68]/20 text-[#B56F68] border border-[#B56F68]/30">
                {attentionCases.length} {attentionCases.length === 1 ? 'case' : 'cases'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#817A70] mt-0.5">
            Cases with severe failure risk, high exposure, or requiring operator approval
          </p>
        </div>

        <Link
          href="/recovery-cases"
          className="text-xs font-mono text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          View all cases <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Empty State */}
      {attentionCases.length === 0 ? (
        <div className="py-8 px-4 rounded-lg bg-[#151513]/60 border border-[rgba(242,237,227,0.06)] text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#6F9B7A]/15 border border-[#6F9B7A]/30 flex items-center justify-center mx-auto text-[#6F9B7A]">
            <CheckCircle className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-[#F2EDE3]">
            No operator intervention required
          </h3>
          <p className="text-[11px] text-[#817A70] max-w-md mx-auto">
            All cases are executing autonomously within deterministic policy guardrails. If a payment failure requires manual approval, it will surface here immediately.
          </p>
        </div>
      ) : (
        /* Actionable Table */
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-left border-collapse text-xs min-w-[620px]">
            <thead>
              <tr className="border-b border-[rgba(242,237,227,0.08)] text-[#817A70] font-mono uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3 font-medium">Case / Customer</th>
                <th className="py-2.5 px-3 font-medium">Category & Trigger</th>
                <th className="py-2.5 px-3 font-medium text-right">Exposure</th>
                <th className="py-2.5 px-3 font-medium text-center">Risk Score</th>
                <th className="py-2.5 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(242,237,227,0.06)]">
              {attentionCases.map((c) => {
                const isHigh = Number(c.risk_score || 0) >= 65;
                const isRetried = retriedIds[c.case_id];
                const isRetrying = retryingId === c.case_id;
                const custName = c.customer_name || 'Customer';
                const custEmail = c.customer_email || '';

                return (
                  <tr
                    key={c.case_id}
                    className="hover:bg-[#24221E]/60 transition-colors duration-100"
                  >
                    {/* Case ID / Customer */}
                    <td className="py-3 px-3">
                      <Link
                        href={`/recovery-cases/${c.case_id}`}
                        className="font-mono font-medium text-[#D1B982] hover:underline"
                      >
                        #{c.case_id.slice(-7).toUpperCase()}
                      </Link>
                      <div className="text-[11px] font-medium text-[#F2EDE3] mt-0.5">
                        {custName}
                      </div>
                      {custEmail && (
                        <div className="text-[10px] text-[#817A70] font-mono truncate max-w-[160px]">
                          {custEmail}
                        </div>
                      )}
                    </td>

                    {/* Category & Trigger */}
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#24221E] text-[#B7B0A3] border border-[rgba(242,237,227,0.08)]">
                        {c.failure_category.replace(/_/g, ' ')}
                      </span>
                      <div className="text-[10px] text-[#817A70] mt-1 font-mono">
                        {formatDate(c.detected_at)}
                      </div>
                    </td>

                    {/* Exposure */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#F2EDE3] text-sm">
                      {formatINR(Number(c.amount_at_risk || 0))}
                    </td>

                    {/* Risk Score */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          isHigh
                            ? 'bg-[#B56F68]/20 text-[#B56F68] border border-[#B56F68]/30'
                            : 'bg-[#B68B4F]/20 text-[#D1B982] border border-[#B89A62]/30'
                        }`}
                      >
                        {c.risk_score || '50'}/100
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRetry(c.case_id)}
                          disabled={isRetrying || isRetried}
                          className="h-7 px-2.5 text-[11px] font-semibold bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] disabled:opacity-50"
                        >
                          {isRetrying ? (
                            <>
                              <RotateCw className="w-3 h-3 animate-spin mr-1" />
                              Retrying
                            </>
                          ) : isRetried ? (
                            'Dispatched'
                          ) : (
                            'Retry'
                          )}
                        </Button>

                        <Link href={`/recovery-cases/${c.case_id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] border-[rgba(242,237,227,0.12)] text-[#B7B0A3] hover:text-[#F2EDE3]"
                          >
                            Inspect
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
