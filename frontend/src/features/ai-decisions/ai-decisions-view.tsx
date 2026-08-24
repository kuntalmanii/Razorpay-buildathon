'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { RecoveryAction } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Bot, ShieldCheck, CheckCircle2 } from 'lucide-react';

export function AiDecisionsView() {
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getRecoveryActions({ page: 1, limit: 20 });
      setActions(res.actions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Policy Guard Architecture Banner */}
      <div className="p-4 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#B89A62]/10 border border-[#B89A62]/25 flex items-center justify-center text-[#D1B982]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#F2EDE3] flex items-center gap-2">
              Autonomous AI Reasoning with Deterministic Safety Gates
              <Badge variant="gold">Phase 6 + 7 Active</Badge>
            </h3>
            <p className="text-xs text-[#817A70] mt-0.5 max-w-2xl leading-relaxed">
              AI models recommend recovery strategies based on customer history and failure telemetry.
              All actions are deterministically validated by the Policy Engine before execution.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Policy Rules Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2EDE3]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9B7A]" /> Max 2 Retries Enforced
          </div>
          <p className="text-xs text-[#817A70] leading-relaxed">
            Prevents infinite retry loops on chronically declining payment cards.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2EDE3]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9B7A]" /> 24-Hour Retry Cooldown
          </div>
          <p className="text-xs text-[#817A70] leading-relaxed">
            Enforces banking cooldown periods between retries to avoid gateway bans.
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2EDE3]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9B7A]" /> Zero Direct Gateway Execution
          </div>
          <p className="text-xs text-[#817A70] leading-relaxed">
            AI outputs structured recommendations only; Razorpay credentials are never exposed to LLMs.
          </p>
        </div>
      </div>

      {/* Recent Actions & Policy Evaluations Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>AI Decisions & Execution Log</CardTitle>
          <CardDescription>
            Audit log of AI proposals, policy approvals/rejections, and execution outcomes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <ErrorState title="Could not load AI decisions" message={error} onRetry={fetchActions} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                </tbody>
              </table>
            </div>
          ) : actions.length === 0 ? (
            <EmptyState
              title="No AI Decisions Generated Yet"
              description="When a payment failure occurs, the AI agent will diagnose the case and evaluate policies here."
              className="m-6 py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181714] text-[#817A70] border-b border-[rgba(242,237,227,0.08)] font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Action ID</th>
                    <th className="py-2.5 px-4 font-medium">Case ID</th>
                    <th className="py-2.5 px-4 font-medium">Proposed Action</th>
                    <th className="py-2.5 px-4 font-medium">Origin</th>
                    <th className="py-2.5 px-4 font-medium">Policy Status</th>
                    <th className="py-2.5 px-4 font-medium">Execution</th>
                    <th className="py-2.5 px-4 font-medium">Timestamp</th>
                    <th className="py-2.5 px-4 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,237,227,0.06)]">
                  {actions.map((act) => {
                    const isPolicyApproved = act.policy_status === 'approved';
                    const isCompleted = act.execution_status === 'completed';

                    return (
                      <tr key={act.action_id} className="hover:bg-[#24221E]/60 transition-colors duration-150">
                        <td className="py-3 px-4 font-mono font-medium text-[#D1B982]">
                          {act.action_id.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-4 font-mono text-[#B7B0A3]">
                          {act.case_id.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium text-[#F2EDE3]">
                            {act.action_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={act.proposed_by === 'ai' ? 'gold' : 'blue'}>
                            {act.proposed_by === 'ai' ? (
                              <>
                                <Bot className="w-2.5 h-2.5 mr-1" /> AI Agent
                              </>
                            ) : (
                              'System'
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${
                              isPolicyApproved
                                ? 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/20'
                                : 'bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/20'
                            }`}
                          >
                            {isPolicyApproved ? 'Approved' : 'Blocked by Policy'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${
                              isCompleted
                                ? 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/20'
                                : act.execution_status === 'scheduled'
                                ? 'bg-[#B68B4F]/10 text-[#B68B4F] border-[#B68B4F]/20'
                                : 'bg-[#24221E] text-[#817A70] border-[rgba(242,237,227,0.08)]'
                            }`}
                          >
                            {act.execution_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#817A70] font-mono text-[11px]">{formatDate(act.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={`/recovery-cases/${act.case_id}/decision`}
                            className="inline-flex items-center text-xs font-mono text-[#D1B982] hover:text-[#F2EDE3] hover:underline"
                          >
                            Deep Dive &rarr;
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
