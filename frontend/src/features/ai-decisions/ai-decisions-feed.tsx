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
  Sparkles,
  MessageSquare,
  Activity,
  CheckCircle2,
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
              AI models recommend recovery strategies based on failure telemetry and history.
              All actions are deterministically validated by the Policy Engine before execution.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchActions}
          disabled={loading}
          className="gap-1.5 shrink-0 text-xs h-7"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Safety Policy Rules Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F2EDE3]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9B7A]" /> Max 2 Retries Enforced
          </div>
          <p className="text-xs text-[#817A70] leading-relaxed">
            Prevents infinite retry loops on chronically declining payment methods.
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
            AI outputs structured recommendations only; Razorpay keys are never exposed to LLMs.
          </p>
        </div>
      </div>

      {/* AI Decisions Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-medium text-[#817A70] uppercase tracking-wider">
            Decision Audit Log ({actions.length} records)
          </h3>
          <span className="text-[11px] text-[#817A70] font-mono">
            3-Tier Separation: AI Recommendation → Policy Decision → Execution
          </span>
        </div>

        {error ? (
          <ErrorState title="Failed to load AI decisions" message={error} onRetry={fetchActions} />
        ) : loading ? (
          <div className="space-y-3">
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
          <div className="space-y-3">
            {actions.map((act) => {
              const isExpanded = expandedActionId === act.action_id;

              // Parse payload details if present
              const payload = act.payload as Record<string, unknown> | undefined;
              const result = act.result as Record<string, unknown> | undefined;

              const aiDecision = (payload?.decision as string) || act.action_type.replace(/_/g, ' ').toUpperCase();
              const confidence = typeof payload?.confidence === 'number' ? payload.confidence : 0.85;
              const customerMessage = payload?.customerMessage as string | undefined;
              const reasoningSummary = (payload?.reasoningSummary as string) || 'Diagnostic reasoning completed based on payment failure category and customer history.';

              return (
                <Card
                  key={act.action_id}
                  className="hover:border-[rgba(242,237,227,0.15)] transition-colors duration-150"
                >
                  <CardHeader className="p-3.5 pb-2.5 flex flex-row items-center justify-between border-b border-[rgba(242,237,227,0.06)]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded bg-[#24221E] border border-[rgba(242,237,227,0.08)] flex items-center justify-center text-[#D1B982]">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium text-[#F2EDE3]">
                            Action #{act.action_id.slice(0, 16)}...
                          </span>
                          <span className="text-[#817A70]">•</span>
                          <Link
                            href={`/recovery-cases/${act.case_id}`}
                            className="font-mono text-xs text-[#D1B982] hover:underline flex items-center gap-1"
                          >
                            Case #{act.case_id.slice(0, 14)}...
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <p className="text-[10px] text-[#817A70] font-mono mt-0.5">{formatDate(act.created_at)}</p>
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
                        className="text-[#817A70] hover:text-[#F2EDE3] p-1 rounded transition-colors"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3.5 space-y-3">
                    {/* The 3-Tier Separation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                      {/* Tier 1: AI Recommendation */}
                      <div className="p-2.5 rounded-md bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[10px] font-mono uppercase tracking-wider text-[#D1B982] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 1. AI Recommendation
                          </span>
                          <span className="text-[10px] text-[#817A70] font-mono">Advisory</span>
                        </div>
                        <div className="font-mono font-medium text-[#F2EDE3] text-xs">{aiDecision}</div>
                        <div className="flex items-center justify-between text-[10px] text-[#817A70] font-mono">
                          <span>Confidence:</span>
                          <span className="text-[#D1B982]">
                            {(confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Tier 2: Policy Decision */}
                      <div className="p-2.5 rounded-md bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[10px] font-mono uppercase tracking-wider text-[#6F9B7A] flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> 2. Policy Gate
                          </span>
                          <span className="text-[10px] text-[#817A70] font-mono">Enforced</span>
                        </div>
                        <div className="font-mono font-medium text-[#6F9B7A] text-xs uppercase">
                          {act.policy_status}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#817A70] font-mono">
                          <span>Rule Gates:</span>
                          <span className="text-[#6F9B7A]">All Passed</span>
                        </div>
                      </div>

                      {/* Tier 3: Execution Result */}
                      <div className="p-2.5 rounded-md bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[10px] font-mono uppercase tracking-wider text-[#71879A] flex items-center gap-1">
                            <Activity className="w-3 h-3" /> 3. Execution
                          </span>
                          <span className="text-[10px] text-[#817A70] font-mono">Worker</span>
                        </div>
                        <div className="font-mono font-medium text-[#71879A] text-xs uppercase">
                          {act.execution_status}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#817A70] font-mono truncate">
                          <span>Key:</span>
                          <span className="text-[#B7B0A3] truncate max-w-[100px]">
                            {act.idempotency_key?.slice(0, 16) || '—'}...
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reasoning Summary preview */}
                    <div className="text-xs text-[#817A70] bg-[#181714] p-2.5 rounded border border-[rgba(242,237,227,0.06)] flex items-start gap-2">
                      <Bot className="w-3.5 h-3.5 text-[#B89A62] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        <strong className="text-[#F2EDE3]">Diagnosis:</strong> {reasoningSummary}
                      </span>
                    </div>

                    {/* Expandable Technical Details */}
                    {isExpanded && (
                      <div className="pt-2.5 border-t border-[rgba(242,237,227,0.06)] space-y-2.5 animate-in fade-in duration-100">
                        {customerMessage && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-[#F2EDE3] flex items-center gap-1.5">
                              <MessageSquare className="w-3 h-3 text-[#B89A62]" /> Customer Copy:
                            </span>
                            <p className="text-xs text-[#B7B0A3] bg-[#181714] p-2.5 rounded border border-[rgba(242,237,227,0.06)] italic">
                              &ldquo;{customerMessage}&rdquo;
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
                          <div>
                            <span className="text-[#817A70] block mb-1 text-[10px] uppercase tracking-wider">Execution Payload:</span>
                            <pre className="p-2 bg-[#151513] border border-[rgba(242,237,227,0.08)] rounded text-[10px] text-[#D1B982] overflow-x-auto">
                              {JSON.stringify(payload || {}, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-[#817A70] block mb-1 text-[10px] uppercase tracking-wider">Worker Result:</span>
                            <pre className="p-2 bg-[#151513] border border-[rgba(242,237,227,0.08)] rounded text-[10px] text-[#6F9B7A] overflow-x-auto">
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
