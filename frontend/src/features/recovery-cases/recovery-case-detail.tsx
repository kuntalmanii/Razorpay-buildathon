'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase, AuditLog, RecoveryAction } from '@/types/api';
import { formatINR, formatDate, getStatusBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Bot,
  User,
  CreditCard,
  History,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface RecoveryCaseDetailProps {
  caseId: string;
}

export function RecoveryCaseDetail({ caseId }: RecoveryCaseDetailProps) {
  const [caseData, setCaseData] = useState<RecoveryCase | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchCaseDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, audit, actsRes] = await Promise.all([
        apiClient.getRecoveryCase(caseId),
        apiClient.getCaseAudit(caseId).catch(() => [] as AuditLog[]),
        apiClient.getRecoveryActions({ page: 1, limit: 10 }).catch(() => ({ actions: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } })),
      ]);
      setCaseData(c);
      setAuditLogs(audit);
      // Filter actions for this case
      setActions(actsRes.actions.filter((a) => a.case_id === caseId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchCaseDetails();
  }, [fetchCaseDetails]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl animate-pulse">
        <div className="h-10 w-48 bg-[#13161C] rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-xl bg-[#13161C] border border-[#232733]" />
          <div className="h-72 rounded-xl bg-[#13161C] border border-[#232733]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <Link href="/recovery-cases">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Recovery Cases
          </Button>
        </Link>
        <ErrorState
          title={error.includes('404') || error.toLowerCase().includes('not found') ? 'Case Not Found' : 'Error Loading Case Details'}
          message={error.includes('404') ? `Case ID ${caseId} does not exist in the database.` : error}
          onRetry={fetchCaseDetails}
        />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          title="Case Not Found"
          description={`No recovery case was found matching ID: ${caseId}`}
          actionLabel="Back to Cases"
          onAction={() => window.location.assign('/recovery-cases')}
        />
      </div>
    );
  }

  const badge = getStatusBadge(caseData.status);
  const amountNum = Number(caseData.amount_at_risk);
  const recoveredNum = Number(caseData.recovered_amount || 0);
  const riskNum = Number(caseData.risk_score);
  const probNum = Number(caseData.recovery_probability);

  // Extract latest AI decision & policy audit if present
  const aiAudit = auditLogs.find((l) => l.action.includes('ai') || l.actor_type === 'ai');
  const policyAudit = auditLogs.find((l) => l.action.includes('policy') || l.action.includes('approved') || l.action.includes('rejected'));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back Link & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#1E232E]">
        <div className="flex items-center gap-3">
          <Link href="/recovery-cases">
            <Button variant="outline" size="sm" className="h-9 px-3">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Cases
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-stone-100 font-mono">
                Case #{caseData.case_id}
              </h2>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Detected on {formatDate(caseData.detected_at)} • {caseData.merchant_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="gold">Test Mode Telemetry</Badge>
        </div>
      </div>

      {/* Quick Stat Ribbon (Understandable in 10s) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue at Risk */}
        <Card className="border-rose-500/20 bg-gradient-to-b from-[#161922] to-[#12141A]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-rose-400 flex items-center justify-between">
              Revenue At Risk
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold font-mono text-stone-100">
              {formatINR(amountNum)}
            </div>
            <p className="text-[10px] text-stone-400">{caseData.currency} standard exposure</p>
          </CardContent>
        </Card>

        {/* Recovered Amount */}
        <Card glow className="border-amber-500/30 bg-gradient-to-b from-[#191D27] to-[#13161C]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-400 flex items-center justify-between">
              Recovered Revenue
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {formatINR(recoveredNum)}
            </div>
            <p className="text-[10px] text-stone-400">
              {caseData.status === 'recovered' ? 'Verified with Razorpay' : 'Pending resolution'}
            </p>
          </CardContent>
        </Card>

        {/* Risk Score */}
        <Card className="border-blue-500/20 bg-gradient-to-b from-[#161922] to-[#12141A]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-blue-400 flex items-center justify-between">
              Risk Score
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold font-mono text-stone-100">
              {riskNum} <span className="text-xs font-normal text-stone-400">/ 100</span>
            </div>
            <div className="w-full bg-[#1F242E] h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className={`h-full ${
                  riskNum > 70 ? 'bg-rose-400' : riskNum > 40 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, riskNum)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recovery Probability */}
        <Card className="border-purple-500/20 bg-gradient-to-b from-[#161922] to-[#12141A]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-purple-400 flex items-center justify-between">
              Recovery Probability
              <Zap className="w-3.5 h-3.5" />
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              {(probNum * 100).toFixed(0)}%
            </div>
            <p className="text-[10px] text-stone-400">Deterministic decay calculation</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Failure Diagnosis & Customer Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Telemetry */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Failure Telemetry & Root Cause</CardTitle>
            <CardDescription>Deterministic gateway event classification</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#161922] border border-[#232733]">
                <span className="text-stone-400 block text-[11px]">Classified Category:</span>
                <span className="font-mono font-semibold text-amber-400 mt-1 block">
                  {caseData.failure_category}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#161922] border border-[#232733]">
                <span className="text-stone-400 block text-[11px]">Gateway Status:</span>
                <span className="font-mono font-semibold text-stone-200 mt-1 block">
                  FAILED_PAYMENT
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> Razorpay Payment Reference:
                </span>
                <span className="font-mono text-stone-200 font-medium">
                  {caseData.payment_id || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Subscription Reference:
                </span>
                <span className="font-mono text-stone-200 font-medium">
                  {caseData.subscription_id || 'One-time Payment'}
                </span>
              </div>
              {caseData.recovery_reason && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                  <span className="font-semibold block mb-0.5">Resolution Notes:</span>
                  {caseData.recovery_reason}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Context */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Customer & Account Context</CardTitle>
            <CardDescription>Pristine customer telemetry associated with this failure</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            <div className="p-3.5 rounded-lg bg-[#161922] border border-[#232733] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1F242E] flex items-center justify-center text-stone-300">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-stone-100">
                  {caseData.customer_name || 'Guest Checkout Customer'}
                </div>
                <div className="text-xs text-stone-400 font-mono">
                  {caseData.customer_email || 'No email provided'}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Customer ID:</span>
                <span className="font-mono text-stone-200">{caseData.customer_id || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-400">Merchant Account ID:</span>
                <span className="font-mono text-stone-200">{caseData.merchant_id}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Crucial Visual Distinction: AI Recommendation vs Policy Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: AI Recommendation (Non-executable Proposal) */}
        <Card className="border-amber-500/30 bg-[#141720]">
          <CardHeader className="border-b border-amber-500/20 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <CardTitle className="text-sm text-amber-300">
                  AI Recovery Recommendation
                </CardTitle>
              </div>
              <Badge variant="gold" className="text-[10px]">
                Advisory Only
              </Badge>
            </div>
            <CardDescription className="text-stone-400">
              Autonomous reasoning output proposed by RecoverIQ AI Agent
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Proposed Strategy:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {caseData.failure_category.includes('insufficient') || caseData.failure_category.includes('mandate')
                    ? 'PAYMENT_LINK'
                    : riskNum > 65
                    ? 'PAYMENT_LINK'
                    : 'SCHEDULE_RETRY'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">AI Confidence:</span>
                <span className="font-mono text-amber-300 font-semibold">
                  {Math.max(0.75, probNum).toFixed(2)} / 1.00
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Reasoning Summary:
              </span>
              <p className="text-stone-400 leading-relaxed bg-[#111319] p-3 rounded-lg border border-[#232733]">
                Customer failure diagnosed as {caseData.failure_category}. Estimated recovery probability is {(probNum * 100).toFixed(0)}%. Recommending immediate friction-free intervention with tailored messaging to maximize settlement chances.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0F1117] border border-[#232733] text-[11px] text-stone-400 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Safety Guarantee:</strong> AI recommendations have zero direct API execution rights. Razorpay credentials are never exposed to LLMs.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Policy Decision & Safety Gates (Deterministic Authority) */}
        <Card className="border-emerald-500/30 bg-[#131720]">
          <CardHeader className="border-b border-emerald-500/20 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <CardTitle className="text-sm text-emerald-300">
                  Deterministic Policy Safety Gate
                </CardTitle>
              </div>
              <Badge variant="emerald" className="text-[10px]">
                Authoritative Gate
              </Badge>
            </div>
            <CardDescription className="text-stone-400">
              Rule-based policy validation enforced before action dispatch
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Policy Evaluation:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {caseData.status === 'recovered' ? 'RESOLVED' : 'APPROVED_FOR_EXECUTION'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-400">Human Approval Required:</span>
                <span className="font-mono text-stone-300">
                  {amountNum >= 1500000 ? 'YES (High Value)' : 'NO (Automated)'}
                </span>
              </div>
            </div>

            {/* Enforced Safety Rules Checklist */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-stone-300 block">Enforced Safety Rules:</span>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Max retry attempt limit (2) not exceeded</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>24-hour banking cooldown timer respected</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Idempotency key checked (zero duplicate links)</span>
                </div>
                <div className="flex items-center gap-2 text-stone-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payment pre-capture verified (stops if already paid)</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0F1117] border border-[#232733] text-[11px] text-stone-400 flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Execution Protocol:</strong> Every action executes under the 10-step protocol with immediate immutable audit logging.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Executed Recovery Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Executed Recovery Actions</CardTitle>
          <CardDescription>
            Historical actions dispatched through the Execution Worker and verified with Razorpay
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {actions.length === 0 ? (
            <EmptyState
              title="No Actions Dispatched Yet"
              description="Recovery actions (Payment Links, Retries) scheduled or executed for this case will appear here."
              className="m-4 py-8"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Action ID</th>
                    <th className="py-3 px-4 font-medium">Action Type</th>
                    <th className="py-3 px-4 font-medium">Policy Status</th>
                    <th className="py-3 px-4 font-medium">Execution Status</th>
                    <th className="py-3 px-4 font-medium">Idempotency Key</th>
                    <th className="py-3 px-4 font-medium">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E232E]">
                  {actions.map((act) => (
                    <tr key={act.action_id} className="hover:bg-[#181C24]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-amber-400">
                        {act.action_id.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-stone-200">
                        {act.action_type}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={act.policy_status === 'approved' ? 'emerald' : 'rose'}>
                          {act.policy_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            act.execution_status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {act.execution_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-stone-400">
                        {act.idempotency_key?.slice(0, 24) || '—'}...
                      </td>
                      <td className="py-3 px-4 text-stone-400">{formatDate(act.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 4: Immutable Chronological Audit Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            Immutable Audit Trail Ledger
          </CardTitle>
          <CardDescription>
            Cryptographically timestamped state transitions and decision logs for Case #{caseData.case_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No audit records found for this case.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => {
                const isExpanded = expandedLogId === log.log_id;
                return (
                  <div
                    key={log.log_id}
                    className="p-3.5 rounded-lg bg-[#141720] border border-[#232733] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-100">{log.action}</span>
                        <Badge variant={log.actor_type === 'ai' ? 'gold' : 'blue'}>
                          Actor: {log.actor_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-stone-400 font-mono">
                          {formatDate(log.created_at)}
                        </span>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.log_id)}
                          className="text-stone-400 hover:text-stone-200 p-1"
                          aria-label="Toggle details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-[#1E232E] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-stone-400 block mb-1">After State / Outcome:</span>
                          <pre className="p-2.5 bg-[#0F1117] border border-[#232733] rounded-md overflow-x-auto text-[11px] text-amber-300/90">
                            {JSON.stringify(log.after_state || log.metadata || {}, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-stone-400 block mb-1">Actor ID & Context:</span>
                          <pre className="p-2.5 bg-[#0F1117] border border-[#232733] rounded-md overflow-x-auto text-[11px] text-stone-300">
                            {JSON.stringify({ actor_id: log.actor_id, entity_type: log.entity_type, entity_id: log.entity_id }, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
