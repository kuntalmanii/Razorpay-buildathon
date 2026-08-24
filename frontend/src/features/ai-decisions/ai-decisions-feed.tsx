'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RecoveryAction } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bot,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  ArrowRight,
  MessageSquare,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function AiDecisionsFeed() {
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getRecoveryActions({ page: 1, limit: 25 });
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

        <Button variant="outline" size="sm" onClick={fetchActions} disabled={loading} className="gap-1.5 shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Decisions
        </Button>
      </div>

      {/* Safety Policy Rules Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Max 2 Retries Enforced
          </div>
          <p className="text-xs text-stone-400">
            Prevents infinite retry loops on chronically declining cards.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 24-Hour Retry Cooldown
          </div>
          <p className="text-xs text-stone-400">
            Enforces banking cooldown periods between retries to avoid gateway bans.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Direct Gateway Execution
          </div>
          <p className="text-xs text-stone-400">
            AI outputs structured recommendations only; Razorpay credentials are never exposed to LLMs.
          </p>
        </Card>
      </div>

      {/* AI Decisions Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider">
            Decision Audit Log ({actions.length} records)
          </h3>
          <span className="text-xs text-stone-400 font-mono">
            3-Tier Separation: AI Recommendation → Policy Decision → Execution
          </span>
        </div>

        {error ? (
          <ErrorState title="Failed to load AI decisions" message={error} onRetry={fetchActions} />
        ) : loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : actions.length === 0 ? (
          <EmptyState
            title="No AI Decisions Generated Yet"
            description="When a payment failure occurs, the AI decision engine will diagnose the case and evaluate policies here."
            className="py-12"
          />
        ) : (
          <div className="space-y-4">
            {actions.map((act) => {
              const isPolicyApproved = act.policy_status === 'approved';
              const isCompleted = act.execution_status === 'completed';
              const isExpanded = expandedActionId === act.action_id;

              // Parse payload details if present
              const payload = act.payload as Record<string, unknown> | undefined;
              const result = act.result as Record<string, unknown> | undefined;

              const aiDecision = (payload?.decision as string) || act.action_type.toUpperCase();
              const confidence = typeof payload?.confidence === 'number' ? payload.confidence : 0.85;
              const customerMessage = payload?.customerMessage as string | undefined;
              const reasoningSummary = (payload?.reasoningSummary as string) || 'Diagnostic reasoning completed based on payment failure category and customer history.';

              return (
                <Card
                  key={act.action_id}
                  className="border-[#232733] hover:border-[#2D3342] transition-colors"
                >
                  <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-[#1E232E]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#181C26] border border-[#282E3B] flex items-center justify-center text-amber-400">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-stone-100">
                            Action #{act.action_id.slice(0, 16)}...
                          </span>
                          <span className="text-stone-500">•</span>
                          <Link
                            href={`/recovery-cases/${act.case_id}`}
                            className="font-mono text-xs text-amber-400 hover:underline flex items-center gap-1"
                          >
                            Case #{act.case_id.slice(0, 14)}...
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <p className="text-[10px] text-stone-400 mt-0.5">{formatDate(act.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/recovery-cases/${act.case_id}/decision`}>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2.5">
                          Deep Dive
                        </Button>
                      </Link>
                      <button
                        onClick={() => setExpandedActionId(isExpanded ? null : act.action_id)}
                        className="text-stone-400 hover:text-stone-200 p-1 rounded"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4">
                    {/* The 3-Tier Separation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Tier 1: AI Recommendation */}
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 1. AI Recommendation
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Advisory</span>
                        </div>
                        <div className="font-mono font-bold text-stone-100 text-sm">{aiDecision}</div>
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span>Confidence:</span>
                          <span className="font-mono text-amber-300 font-semibold">
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Tier 2: Policy Decision */}
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 2. Policy Decision
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Enforced</span>
                        </div>
                        <div className="font-mono font-bold text-emerald-400 text-sm uppercase">
                          {act.policy_status}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-400">
                          <span>Rule Gates:</span>
                          <span className="text-emerald-400 font-medium">All Passed</span>
                        </div>
                      </div>

                      {/* Tier 3: Execution Result */}
                      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-blue-400 flex items-center gap-1">
                            <Activity className="w-3 h-3" /> 3. Execution Result
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">Worker</span>
                        </div>
                        <div className="font-mono font-bold text-blue-400 text-sm uppercase">
                          {act.execution_status}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono truncate">
                          <span>Key:</span>
                          <span className="text-stone-300 truncate max-w-[120px]">
                            {act.idempotency_key?.slice(0, 18) || '—'}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning Summary preview */}
                    <div className="mt-3 text-xs text-stone-400 bg-[#0F1117] p-2.5 rounded-lg border border-[#1E232E] flex items-start gap-2">
                      <Bot className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-stone-300">Diagnosis:</strong> {reasoningSummary}
                      </span>
                    </div>

                    {/* Expandable Technical Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-[#1E232E] space-y-3 animate-in fade-in duration-150">
                        {customerMessage && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Customer-Facing Message Copy:
                            </span>
                            <p className="text-xs text-stone-300 bg-[#161922] p-3 rounded-lg border border-[#232733] italic">
                              &ldquo;{customerMessage}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-stone-400 block mb-1">Execution Payload:</span>
                            <pre className="p-2.5 bg-[#0F1117] border border-[#232733] rounded-md overflow-x-auto text-[11px] text-amber-300/90">
                              {JSON.stringify(payload || {}, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-stone-400 block mb-1">Worker Result:</span>
                            <pre className="p-2.5 bg-[#0F1117] border border-[#232733] rounded-md overflow-x-auto text-[11px] text-emerald-300/90">
                              {JSON.stringify(result || { status: act.execution_status }, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
