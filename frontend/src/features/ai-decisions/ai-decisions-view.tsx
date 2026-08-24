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
import { Bot, ShieldCheck, ShieldAlert, Cpu, Sparkles, CheckCircle } from 'lucide-react';

export function AiDecisionsView() {
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getRecoveryActions({ page: 1, limit: 20 });
      setActions(res.actions);
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
    <div className="space-y-6">
      {/* Policy Guard Architecture Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#13161C] to-blue-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
              Autonomous AI Reasoning with Deterministic Safety Gates
              <Badge variant="gold">Phase 6 + 7 Active</Badge>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5 max-w-2xl">
              AI models recommend recovery strategies based on customer history and failure telemetry.
              All actions are deterministically validated by the Policy Engine before execution.
            </p>
          </div>
        </div>
      </div>

      {/* Safety Policy Rules Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Max 2 Retries Enforced
          </div>
          <p className="text-xs text-stone-400">
            Prevents infinite retry loops on chronically declining cards.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> 24-Hour Retry Cooldown
          </div>
          <p className="text-xs text-stone-400">
            Enforces banking cooldown periods between retries to avoid gateway bans.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CheckCircle className="w-4 h-4 text-emerald-400" /> Zero Direct Gateway Execution
          </div>
          <p className="text-xs text-stone-400">
            AI outputs structured recommendations only; Razorpay credentials are never exposed to LLMs.
          </p>
        </Card>
      </div>

      {/* Recent Actions & Policy Evaluations Table */}
      <Card>
        <CardHeader>
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
                <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Action ID</th>
                    <th className="py-3 px-4 font-medium">Case ID</th>
                    <th className="py-3 px-4 font-medium">Proposed Action</th>
                    <th className="py-3 px-4 font-medium">Origin</th>
                    <th className="py-3 px-4 font-medium">Policy Status</th>
                    <th className="py-3 px-4 font-medium">Execution</th>
                    <th className="py-3 px-4 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E232E]">
                  {actions.map((act) => {
                    const isPolicyApproved = act.policy_status === 'approved';
                    const isCompleted = act.execution_status === 'completed';

                    return (
                      <tr key={act.action_id} className="hover:bg-[#181C24]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-amber-400">
                          {act.action_id.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-300">
                          {act.case_id.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-semibold text-stone-200">
                            {act.action_type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={act.proposed_by === 'ai' ? 'gold' : 'blue'}>
                            {act.proposed_by === 'ai' ? (
                              <>
                                <Bot className="w-3 h-3 mr-1" /> AI Agent
                              </>
                            ) : (
                              'System'
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              isPolicyApproved
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {isPolicyApproved ? 'Approved' : 'Blocked by Policy'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : act.execution_status === 'scheduled'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-stone-800 text-stone-400 border-stone-700'
                            }`}
                          >
                            {act.execution_status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-400">{formatDate(act.created_at)}</td>
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
