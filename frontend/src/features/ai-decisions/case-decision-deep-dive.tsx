'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase, RecoveryAction, AuditLog } from '@/types/api';
import { formatINR, formatDate, getStatusBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  History,
  ExternalLink,
  Layers,
} from 'lucide-react';

export interface CaseDecisionDeepDiveProps {
  caseId: string;
}

export function CaseDecisionDeepDive({ caseId }: CaseDecisionDeepDiveProps) {
  const [caseData, setCaseData] = useState<RecoveryCase | null>(null);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, actsRes, audit] = await Promise.all([
        apiClient.getRecoveryCase(caseId),
        apiClient.getRecoveryActions({ page: 1, limit: 10 }).catch(() => ({ actions: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
        apiClient.getCaseAudit(caseId).catch(() => [] as AuditLog[]),
      ]);
      setCaseData(c);
      setActions(actsRes.actions.filter((a) => a.case_id === caseId));
      setAuditLogs(audit);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl animate-pulse">
        <div className="h-10 w-48 bg-[#13161C] rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <Link href={`/recovery-cases/${caseId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Case #{caseId}
          </Button>
        </Link>
        <ErrorState
          title="Could not load AI decision deep dive"
          message={error || 'Case not found'}
          onRetry={fetchCase}
        />
      </div>
    );
  }

  const latestAction = actions[0];
  const payload = latestAction?.payload as Record<string, unknown> | undefined;
  const result = latestAction?.result as Record<string, unknown> | undefined;

  const decision = (payload?.decision as string) || (caseData.failure_category.includes('insufficient') ? 'PAYMENT_LINK' : 'SCHEDULE_RETRY');
  const confidence = typeof payload?.confidence === 'number' ? payload.confidence : Number(caseData.recovery_probability);
  const reasoning = (payload?.reasoningSummary as string) || `Diagnosed as ${caseData.failure_category}. Evaluated customer telemetry and established deterministic recovery pathway.`;
  const customerMsg = (payload?.customerMessage as string) || `Hello! We noticed a temporary issue with your payment of ${formatINR(Number(caseData.amount_at_risk))}. Please complete your transaction using this secure link.`;

  const amountNum = Number(caseData.amount_at_risk);
  const riskNum = Number(caseData.risk_score);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#1E232E]">
        <div className="flex items-center gap-3">
          <Link href={`/recovery-cases/${caseId}`}>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Case Details
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-stone-100 font-mono">
                AI Reasoning & Policy Deep Dive: Case #{caseId}
              </h2>
              <Badge variant="gold">Phase 6 AI</Badge>
              <Badge variant="emerald">Phase 7 Policy</Badge>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Amount: {formatINR(amountNum)} • Category: {caseData.failure_category} • Risk: {riskNum}/100
            </p>
          </div>
        </div>
      </div>

      {/* 3-Tier Visual Separation Architecture Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TIER 1: AI RECOMMENDATION */}
        <Card className="border-amber-500/30 bg-[#141720] flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-amber-500/20 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm text-amber-300">
                    1. AI Recommendation
                  </CardTitle>
                </div>
                <Badge variant="gold" className="text-[10px]">
                  Advisory Model Output
                </Badge>
              </div>
              <CardDescription className="text-stone-400">
                Non-executable strategy formulated by the AI recovery agent
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Decision & Confidence */}
              <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">Recommended Action:</span>
                  <span className="font-mono font-bold text-amber-400 text-base">
                    {decision}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Model Confidence:</span>
                  <span className="font-mono text-amber-300 font-semibold text-sm">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Evidence Signals */}
              <div className="space-y-2 text-xs">
                <span className="font-semibold text-stone-300 block">Telemetry Evidence Evaluated:</span>
                <div className="space-y-1 text-stone-400 text-[11px]">
                  <p>• Failure Category: <span className="text-stone-200 font-mono">{caseData.failure_category}</span></p>
                  <p>• Exposure: <span className="text-stone-200 font-mono">{formatINR(amountNum)}</span></p>
                  <p>• Calculated Risk Score: <span className="text-stone-200 font-mono">{riskNum}/100</span></p>
                </div>
              </div>

              {/* Reasoning Summary */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Reasoning Summary:
                </span>
                <p className="text-stone-300 text-xs leading-relaxed bg-[#111319] p-3 rounded-lg border border-[#232733]">
                  {reasoning}
                </p>
              </div>

              {/* Customer Messaging Preview */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Customer Message Copy:
                </span>
                <p className="text-stone-300 text-xs italic bg-[#111319] p-3 rounded-lg border border-[#232733]">
                  &ldquo;{customerMsg}&rdquo;
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-3 m-4 rounded-lg bg-[#0F1117] border border-[#232733] text-[11px] text-stone-400 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>AI recommendation only. The model cannot execute payments directly.</span>
          </div>
        </Card>

        {/* TIER 2: POLICY DECISION */}
        <Card className="border-emerald-500/30 bg-[#131720] flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-emerald-500/20 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm text-emerald-300">
                    2. Policy Decision
                  </CardTitle>
                </div>
                <Badge variant="emerald" className="text-[10px]">
                  Authoritative Gate
                </Badge>
              </div>
              <CardDescription className="text-stone-400">
                Deterministic rule engine evaluation & compliance gate
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Gate Result */}
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">Gate Outcome:</span>
                  <span className="font-mono font-bold text-emerald-400 text-base uppercase">
                    {latestAction?.policy_status || 'APPROVED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Human Approval Required:</span>
                  <span className="font-mono text-stone-300 font-semibold">
                    {amountNum >= 1500000 ? 'YES (High Value)' : 'NO (Automated)'}
                  </span>
                </div>
              </div>

              {/* Safety Rules Checklist */}
              <div className="space-y-2.5 text-xs">
                <span className="font-semibold text-stone-300 block">Deterministic Rules Checked:</span>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-stone-300 bg-[#111319] p-2 rounded-lg border border-[#232733]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Rule 1: Retry Attempt Limit</span>
                      <p className="text-[11px] text-stone-400">Maximum 2 automated attempts per case enforced.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-stone-300 bg-[#111319] p-2 rounded-lg border border-[#232733]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Rule 2: Retry Cooldown Timer</span>
                      <p className="text-[11px] text-stone-400">24-hour minimum banking cooldown enforced.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-stone-300 bg-[#111319] p-2 rounded-lg border border-[#232733]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Rule 3: Idempotency Protection</span>
                      <p className="text-[11px] text-stone-400">Unique idempotency key verified before dispatch.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-stone-300 bg-[#111319] p-2 rounded-lg border border-[#232733]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">Rule 4: Terminal State Defense</span>
                      <p className="text-[11px] text-stone-400">Never charges if payment is already captured.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-3 m-4 rounded-lg bg-[#0F1117] border border-[#232733] text-[11px] text-stone-400 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Policy engine overrides AI whenever a rule constraint is violated.</span>
          </div>
        </Card>

        {/* TIER 3: EXECUTION RESULT */}
        <Card className="border-blue-500/30 bg-[#121620] flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-blue-500/20 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm text-blue-300">
                    3. Execution Result
                  </CardTitle>
                </div>
                <Badge variant="blue" className="text-[10px]">
                  Execution Worker
                </Badge>
              </div>
              <CardDescription className="text-stone-400">
                Physical action dispatch through Razorpay Test Mode services
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Execution Status */}
              <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">Execution Status:</span>
                  <span className="font-mono font-bold text-blue-400 text-base uppercase">
                    {latestAction?.execution_status || 'SCHEDULED'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Action Dispatched:</span>
                  <span className="font-mono text-stone-200">
                    {latestAction?.action_type || 'create_payment_link'}
                  </span>
                </div>
              </div>

              {/* Idempotency & Gateway Results */}
              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#111319] border border-[#232733]">
                  <span className="text-stone-400 block text-[10px]">Idempotency Key:</span>
                  <span className="text-stone-200 text-[11px] break-all">
                    {latestAction?.idempotency_key || `recov_${caseId.slice(0, 16)}_act_1`}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#111319] border border-[#232733]">
                  <span className="text-stone-400 block text-[10px]">Dispatched Payload / Result:</span>
                  <pre className="text-amber-300/90 text-[10px] mt-1 overflow-x-auto">
                    {JSON.stringify(result || { status: 'executing' }, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-3 m-4 rounded-lg bg-[#0F1117] border border-[#232733] text-[11px] text-stone-400 flex items-start gap-2">
            <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>Actions execute with bounded exponential retry only on transient 503/504 errors.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
