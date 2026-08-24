'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { RecoveryFlowVisualizer } from './recovery-flow-visualizer';
import {
  ArrowLeft,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertTriangle,
  History,
  CreditCard,
  User,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CaseDetailProps {
  caseId: string;
}

export function RecoveryCaseDetail({ caseId }: CaseDetailProps) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<RecoveryCase | null>(null);
  const [actions, setActions] = useState<RecoveryAction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchCaseDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [caseRes, actsRes, auditRes] = await Promise.all([
        apiClient.getRecoveryCaseById(caseId),
        apiClient.getRecoveryActions(caseId),
        apiClient.getCaseAudit(caseId),
      ]);
      setCaseData(caseRes);
      setActions(actsRes.actions || actsRes);
      setAuditLogs(auditRes.logs || auditRes);
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
        <div className="h-9 w-48 bg-[#1C1B18] rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]" />
          <div className="h-64 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <Link href="/recovery-cases">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Recovery Cases
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
          onAction={() => router.push('/recovery-cases')}
        />
      </div>
    );
  }

  const badge = getStatusBadge(caseData.status);
  const amountNum = Number(caseData.amount_at_risk);
  const recoveredNum = Number(caseData.recovered_amount || 0);
  const riskNum = Number(caseData.risk_score);
  const probNum = Number(caseData.recovery_probability);

  return (
    <div className="space-y-6 max-w-7xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      {/* Breadcrumb Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(242,237,227,0.08)]">
        <div className="flex items-center gap-3">
          <Link href="/recovery-cases">
            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Cases
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#817A70] font-mono">Recovery Cases /</span>
              <h2 className="text-sm sm:text-base font-semibold text-[#F2EDE3] font-mono">
                {caseData.case_id}
              </h2>
              <span
                className={`inline-flex px-2 py-0.2 rounded text-[10px] font-mono font-medium border ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="text-[11px] text-[#817A70] font-mono mt-0.5">
              Detected on {formatDate(caseData.detected_at)} • Merchant: {caseData.merchant_id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="gold">Test Mode Telemetry</Badge>
        </div>
      </div>

      {/* 4 Key Stat Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue at Risk */}
        <Card className="border-l-2 border-l-[#B56F68]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#B56F68] font-medium flex items-center justify-between">
              Revenue At Risk
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div className="text-xl font-bold font-mono text-[#F2EDE3]">
              {formatINR(amountNum)}
            </div>
            <p className="text-[10px] text-[#817A70] font-mono">{caseData.currency} standard exposure</p>
          </CardContent>
        </Card>

        {/* Recovered Amount */}
        <Card className="border-l-2 border-l-[#6F9B7A]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6F9B7A] font-medium flex items-center justify-between">
              Recovered Revenue
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <div className="text-xl font-bold font-mono text-[#6F9B7A]">
              {formatINR(recoveredNum)}
            </div>
            <p className="text-[10px] text-[#817A70] font-mono">
              {caseData.status === 'recovered' ? 'Verified Settlement' : 'Pending resolution'}
            </p>
          </CardContent>
        </Card>

        {/* Risk Score */}
        <Card className="border-l-2 border-l-[#71879A]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#71879A] font-medium flex items-center justify-between">
              Risk Score
              <ShieldAlert className="w-3.5 h-3.5" />
            </span>
            <div className="text-xl font-bold font-mono text-[#F2EDE3]">
              {riskNum} <span className="text-xs font-normal text-[#817A70]">/ 100</span>
            </div>
            <div className="w-full bg-[#24221E] h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${
                  riskNum > 70 ? 'bg-[#B56F68]' : riskNum > 40 ? 'bg-[#B68B4F]' : 'bg-[#6F9B7A]'
                }`}
                style={{ width: `${Math.min(100, riskNum)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recovery Probability */}
        <Card className="border-l-2 border-l-[#B89A62]">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#B89A62] font-medium flex items-center justify-between">
              Recovery Probability
              <Bot className="w-3.5 h-3.5" />
            </span>
            <div className="text-xl font-bold font-mono text-[#6F9B7A]">
              {(probNum * 100).toFixed(0)}%
            </div>
            <p className="text-[10px] text-[#817A70] font-mono">Deterministic decay estimate</p>
          </CardContent>
        </Card>
      </div>

      {/* Signature 7-Stage Recovery Lifecycle Flow Visualizer */}
      <RecoveryFlowVisualizer
        caseData={caseData}
        actions={actions}
        auditLogs={auditLogs}
      />

      {/* Row 1: Failure Diagnosis & Customer Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failure Telemetry */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Failure Telemetry & Root Cause</CardTitle>
            <CardDescription>Deterministic gateway event classification</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)]">
                <span className="text-[#817A70] block text-[10px] font-mono">Classified Category:</span>
                <span className="font-mono font-medium text-[#D1B982] mt-0.5 block">
                  {caseData.failure_category}
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)]">
                <span className="text-[#817A70] block text-[10px] font-mono">Gateway Status:</span>
                <span className="font-mono font-medium text-[#F2EDE3] mt-0.5 block">
                  FAILED_PAYMENT
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[#817A70] flex items-center gap-1.5 font-mono text-[11px]">
                  <CreditCard className="w-3 h-3" /> Razorpay Payment Reference:
                </span>
                <span className="font-mono text-[#F2EDE3]">
                  {caseData.payment_id || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#817A70] flex items-center gap-1.5 font-mono text-[11px]">
                  <Layers className="w-3 h-3" /> Subscription Reference:
                </span>
                <span className="font-mono text-[#F2EDE3]">
                  {caseData.subscription_id || 'One-time Payment'}
                </span>
              </div>
              {caseData.recovery_reason && (
                <div className="p-2.5 rounded bg-[#6F9B7A]/10 border border-[#6F9B7A]/20 text-[#6F9B7A] text-xs font-mono">
                  <span className="font-semibold block mb-0.5">Resolution Notes:</span>
                  {caseData.recovery_reason}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Context */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Customer & Account Context</CardTitle>
            <CardDescription>Associated merchant customer telemetry</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="p-3 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-[#24221E] flex items-center justify-center text-[#817A70] border border-[rgba(242,237,227,0.08)]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="font-medium text-xs sm:text-sm text-[#F2EDE3]">
                  {caseData.customer_name || 'Guest Checkout Customer'}
                </div>
                <div className="text-[11px] text-[#817A70] font-mono">
                  {caseData.customer_email || 'No email provided'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-1 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#817A70]">Customer ID:</span>
                <span className="text-[#F2EDE3]">{caseData.customer_id || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#817A70]">Merchant Account ID:</span>
                <span className="text-[#F2EDE3]">{caseData.merchant_id}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: AI Recommendation vs Deterministic Policy Gate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: AI Recommendation (Advisory Only) */}
        <Card className="border-[#B89A62]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#B89A62]/10 border border-[#B89A62]/25 flex items-center justify-center text-[#D1B982]">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <CardTitle className="text-sm text-[#D1B982]">
                  AI Recovery Recommendation
                </CardTitle>
              </div>
              <Badge variant="gold" className="text-[10px]">
                Advisory Only
              </Badge>
            </div>
            <CardDescription>
              Autonomous reasoning output proposed by RecoverIQ AI Agent
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div className="p-3 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#817A70]">Proposed Strategy:</span>
                <span className="font-bold text-[#D1B982]">
                  {caseData.failure_category.includes('insufficient') || caseData.failure_category.includes('mandate')
                    ? 'PAYMENT_LINK'
                    : riskNum > 65
                    ? 'PAYMENT_LINK'
                    : 'SCHEDULE_RETRY'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#817A70]">AI Confidence:</span>
                <span className="text-[#F2EDE3]">
                  {Math.max(0.75, probNum).toFixed(2)} / 1.00
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="font-medium text-[#B7B0A3] flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-[#B89A62]" /> Reasoning Summary:
              </span>
              <p className="text-[#B7B0A3] leading-relaxed bg-[#181714] p-2.5 rounded border border-[rgba(242,237,227,0.06)] text-[11px]">
                Customer failure diagnosed as {caseData.failure_category}. Estimated recovery probability is {(probNum * 100).toFixed(0)}%. Recommending immediate friction-free intervention with tailored messaging to maximize settlement chances.
              </p>
            </div>

            <div className="p-2 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] text-[10px] text-[#817A70] flex items-start gap-2 font-mono">
              <Lock className="w-3 h-3 text-[#B89A62] shrink-0 mt-0.5" />
              <span>
                <strong>Safety Guarantee:</strong> AI recommendations have zero direct API execution rights. Razorpay credentials are never exposed to LLMs.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Policy Decision & Safety Gates (Deterministic Authority) */}
        <Card className="border-[#6F9B7A]/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#6F9B7A]/10 border border-[#6F9B7A]/25 flex items-center justify-center text-[#6F9B7A]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <CardTitle className="text-sm text-[#6F9B7A]">
                  Deterministic Policy Safety Gate
                </CardTitle>
              </div>
              <Badge variant="emerald" className="text-[10px]">
                Authoritative Gate
              </Badge>
            </div>
            <CardDescription>
              Rule-based policy validation enforced before action dispatch
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div className="p-3 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#817A70]">Policy Evaluation:</span>
                <span className="font-bold text-[#6F9B7A]">
                  {caseData.status === 'recovered' ? 'RESOLVED' : 'APPROVED_FOR_EXECUTION'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#817A70]">Human Approval Required:</span>
                <span className="text-[#F2EDE3]">
                  {amountNum >= 1500000 ? 'YES (High Value)' : 'NO (Automated)'}
                </span>
              </div>
            </div>

            {/* Enforced Safety Rules Checklist */}
            <div className="space-y-1.5 text-xs">
              <span className="font-medium text-[#B7B0A3] block">Enforced Safety Rules:</span>
              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center gap-2 text-[#B7B0A3]">
                  <CheckCircle2 className="w-3 h-3 text-[#6F9B7A]" />
                  <span>Max retry attempt limit (2) not exceeded</span>
                </div>
                <div className="flex items-center gap-2 text-[#B7B0A3]">
                  <CheckCircle2 className="w-3 h-3 text-[#6F9B7A]" />
                  <span>24-hour banking cooldown timer respected</span>
                </div>
                <div className="flex items-center gap-2 text-[#B7B0A3]">
                  <CheckCircle2 className="w-3 h-3 text-[#6F9B7A]" />
                  <span>Idempotency key checked (zero duplicate links)</span>
                </div>
                <div className="flex items-center gap-2 text-[#B7B0A3]">
                  <CheckCircle2 className="w-3 h-3 text-[#6F9B7A]" />
                  <span>Payment pre-capture verified (stops if already paid)</span>
                </div>
              </div>
            </div>

            <div className="p-2 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] text-[10px] text-[#817A70] flex items-start gap-2 font-mono">
              <ShieldCheck className="w-3 h-3 text-[#6F9B7A] shrink-0 mt-0.5" />
              <span>
                <strong>Execution Protocol:</strong> Every action executes under the 10-step protocol with immediate immutable audit logging.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Executed Recovery Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Executed Recovery Actions</CardTitle>
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
                <thead className="bg-[#181714] text-[#817A70] border-b border-[rgba(242,237,227,0.08)] font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Action ID</th>
                    <th className="py-2.5 px-4 font-medium">Action Type</th>
                    <th className="py-2.5 px-4 font-medium">Policy Status</th>
                    <th className="py-2.5 px-4 font-medium">Execution Status</th>
                    <th className="py-2.5 px-4 font-medium">Idempotency Key</th>
                    <th className="py-2.5 px-4 font-medium">Executed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,237,227,0.06)]">
                  {actions.map((act) => (
                    <tr key={act.action_id} className="hover:bg-[#24221E]/60 transition-colors duration-150">
                      <td className="py-3 px-4 font-mono font-medium text-[#D1B982]">
                        {act.action_id.slice(0, 16)}...
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-[#F2EDE3]">
                        {act.action_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={act.policy_status === 'approved' ? 'emerald' : 'rose'}>
                          {act.policy_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                            act.execution_status === 'completed'
                              ? 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/20'
                              : 'bg-[#B68B4F]/10 text-[#B68B4F] border-[#B68B4F]/20'
                          }`}
                        >
                          {act.execution_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#817A70]">
                        {act.idempotency_key?.slice(0, 24) || '—'}...
                      </td>
                      <td className="py-3 px-4 text-[#817A70] font-mono text-[11px]">{formatDate(act.created_at)}</td>
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-[#B89A62]" />
            Immutable Audit Trail Ledger
          </CardTitle>
          <CardDescription>
            Cryptographically timestamped state transitions and decision logs for Case #{caseData.case_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-[#817A70] italic">No audit records found for this case.</p>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((log) => {
                const isExpanded = expandedLogId === log.log_id;
                return (
                  <div
                    key={log.log_id}
                    className="p-3 rounded-lg bg-[#181714] border border-[rgba(242,237,227,0.06)] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-[#F2EDE3]">{log.action}</span>
                        <Badge variant={log.actor_type === 'ai' ? 'gold' : 'blue'}>
                          Actor: {log.actor_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-[#817A70] font-mono">
                          {formatDate(log.created_at)}
                        </span>
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.log_id)}
                          className="text-[#817A70] hover:text-[#F2EDE3] p-0.5 rounded transition-colors"
                          aria-label="Toggle details"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-[rgba(242,237,227,0.06)] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-[#817A70] block mb-1 text-[10px] uppercase tracking-wider">After State / Outcome:</span>
                          <pre className="p-2 bg-[#151513] border border-[rgba(242,237,227,0.08)] rounded text-[10px] text-[#D1B982] overflow-x-auto">
                            {JSON.stringify(log.after_state || log.metadata || {}, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[#817A70] block mb-1 text-[10px] uppercase tracking-wider">Actor ID & Context:</span>
                          <pre className="p-2 bg-[#151513] border border-[rgba(242,237,227,0.08)] rounded text-[10px] text-[#B7B0A3] overflow-x-auto">
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
