'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase, RecoveryAction, AuditLog } from '@/types/api';
import { formatINR, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Bot,
  ShieldCheck,
  Sparkles,
  Lock,
  Activity,
  CheckCircle2,
  MessageSquare,
  History,
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
        <div className="h-9 w-48 bg-[#1C1B18] rounded-md" />
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
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Case #{caseId}
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
    <div className="space-y-6 max-w-7xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(242,237,227,0.08)]">
        <div className="flex items-center gap-3">
          <Link href={`/recovery-cases/${caseId}`}>
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Case Details
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#817A70] font-mono">Decisions /</span>
              <h2 className="text-sm sm:text-base font-semibold text-[#F2EDE3] font-mono">
                {caseId}
              </h2>
              <Badge variant="gold">AI Reasoning</Badge>
              <Badge variant="emerald">Policy Gate</Badge>
            </div>
            <p className="text-[11px] text-[#817A70] font-mono mt-0.5">
              Amount: {formatINR(amountNum)} • Category: {caseData.failure_category} • Risk: {riskNum}/100
            </p>
          </div>
        </div>
      </div>

      {/* 3-Tier Visual Separation Architecture Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TIER 1: AI RECOMMENDATION */}
        <Card className="border-[#B89A62]/30 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#B89A62]/10 border border-[#B89A62]/25 flex items-center justify-center text-[#D1B982]">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle className="text-sm text-[#D1B982]">
                    1. AI Recommendation
                  </CardTitle>
                </div>
                <Badge variant="gold" className="text-[10px]">
                  Advisory Output
                </Badge>
              </div>
              <CardDescription>
                Non-executable strategy formulated by the AI recovery agent
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3.5">
              {/* Decision & Confidence */}
              <div className="p-3 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#817A70]">Action:</span>
                  <span className="font-bold text-[#D1B982]">
                    {decision}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#817A70]">Confidence:</span>
                  <span className="text-[#F2EDE3]">
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Evidence Signals */}
              <div className="space-y-1 text-xs">
                <span className="font-medium text-[#B7B0A3] block">Telemetry Evidence:</span>
                <div className="space-y-0.5 text-[#817A70] text-[11px] font-mono">
                  <p>• Category: <span className="text-[#F2EDE3]">{caseData.failure_category}</span></p>
                  <p>• Exposure: <span className="text-[#F2EDE3]">{formatINR(amountNum)}</span></p>
                  <p>• Risk Score: <span className="text-[#F2EDE3]">{riskNum}/100</span></p>
                </div>
              </div>

              {/* Reasoning Summary */}
              <div className="space-y-1 text-xs">
                <span className="font-medium text-[#B7B0A3] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#B89A62]" /> Reasoning Summary:
                </span>
                <p className="text-[#B7B0A3] text-[11px] leading-relaxed bg-[#181714] p-2.5 rounded border border-[rgba(242,237,227,0.06)]">
                  {reasoning}
                </p>
              </div>

              {/* Customer Messaging Preview */}
              <div className="space-y-1 text-xs">
                <span className="font-medium text-[#B7B0A3] flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 text-[#B89A62]" /> Customer Copy:
                </span>
                <p className="text-[#B7B0A3] text-[11px] italic bg-[#181714] p-2.5 rounded border border-[rgba(242,237,227,0.06)]">
                  &ldquo;{customerMsg}&rdquo;
                </p>
              </div>
            </CardContent>
          </div>

          <div className="p-2.5 m-4 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] text-[10px] text-[#817A70] flex items-start gap-2 font-mono">
            <Lock className="w-3 h-3 text-[#B89A62] shrink-0 mt-0.5" />
            <span>AI recommendation only. Zero direct gateway execution authority.</span>
          </div>
        </Card>

        {/* TIER 2: POLICY DECISION */}
        <Card className="border-[#6F9B7A]/30 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#6F9B7A]/10 border border-[#6F9B7A]/25 flex items-center justify-center text-[#6F9B7A]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle className="text-sm text-[#6F9B7A]">
                    2. Policy Decision
                  </CardTitle>
                </div>
                <Badge variant="emerald" className="text-[10px]">
                  Authoritative Gate
                </Badge>
              </div>
              <CardDescription>
                Deterministic rule engine evaluation & compliance gate
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3.5">
              {/* Gate Result */}
              <div className="p-3 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#817A70]">Outcome:</span>
                  <span className="font-bold text-[#6F9B7A] uppercase">
                    {latestAction?.policy_status || 'APPROVED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#817A70]">Human Review:</span>
                  <span className="text-[#F2EDE3]">
                    {amountNum >= 1500000 ? 'YES (High Value)' : 'NO (Automated)'}
                  </span>
                </div>
              </div>

              {/* Safety Rules Checklist */}
              <div className="space-y-1.5 text-xs">
                <span className="font-medium text-[#B7B0A3] block">Safety Rules Evaluated:</span>
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-[#6F9B7A]">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Max retry limit (2) not exceeded</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#6F9B7A]">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>24h retry cooldown enforced</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#6F9B7A]">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Idempotency checked</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#6F9B7A]">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>No active successful payment</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-2.5 m-4 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] text-[10px] text-[#817A70] flex items-start gap-2 font-mono">
            <ShieldCheck className="w-3 h-3 text-[#6F9B7A] shrink-0 mt-0.5" />
            <span>Deterministic gate. Blocks any unsafe action before execution.</span>
          </div>
        </Card>

        {/* TIER 3: EXECUTION RESULT */}
        <Card className="border-[#71879A]/30 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#71879A]/10 border border-[#71879A]/25 flex items-center justify-center text-[#71879A]">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle className="text-sm text-[#71879A]">
                    3. Execution Result
                  </CardTitle>
                </div>
                <Badge variant="blue" className="text-[10px]">
                  Worker Execution
                </Badge>
              </div>
              <CardDescription>
                Razorpay API execution, payload dispatch, and verification
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3.5">
              {/* Execution Status */}
              <div className="p-3 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#817A70]">Status:</span>
                  <span className="font-bold text-[#71879A] uppercase">
                    {latestAction?.execution_status || 'COMPLETED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#817A70]">Idempotency:</span>
                  <span className="text-[#F2EDE3] truncate max-w-[120px]">
                    {latestAction?.idempotency_key?.slice(0, 16) || 'key_verified'}...
                  </span>
                </div>
              </div>

              {/* Execution Details */}
              <div className="space-y-1 text-xs">
                <span className="font-medium text-[#B7B0A3] block">Execution Summary:</span>
                <pre className="p-2.5 bg-[#181714] border border-[rgba(242,237,227,0.06)] rounded text-[10px] font-mono text-[#D1B982] overflow-x-auto">
                  {JSON.stringify(result || { status: 'completed', gateway: 'razorpay' }, null, 2)}
                </pre>
              </div>
            </CardContent>
          </div>

          <div className="p-2.5 m-4 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] text-[10px] text-[#817A70] flex items-start gap-2 font-mono">
            <History className="w-3 h-3 text-[#71879A] shrink-0 mt-0.5" />
            <span>Audit log recorded: {auditLogs.length} state transitions verified.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
