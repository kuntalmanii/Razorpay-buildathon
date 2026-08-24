'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { EvaluationReport } from '@/types/api';
import { formatINR, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricTooltip } from '@/components/ui/tooltip';
import {
  Award,
  Play,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  BarChart3,
  Server,
  Layers,
  Sparkles,
  DollarSign,
  Activity,
  Cpu,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function EvaluationDashboard() {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningEval, setRunningEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatestReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getEvaluation();
      setReport(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestReport();
  }, [fetchLatestReport]);

  const handleRunEvaluation = async () => {
    setRunningEval(true);
    setError(null);
    try {
      const res = await apiClient.runEvaluation();
      setReport(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunningEval(false);
    }
  };

  const CATEGORY_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444'];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Test-Run Hero Banner: Run Evaluation */}
      <Card glow className="border-amber-500/30 bg-gradient-to-r from-[#181C26] via-[#13161C] to-[#161C24]">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    RecoverIQ Benchmark & Evaluation Suite
                    <Badge variant="gold">Judge Evaluation View</Badge>
                  </h2>
                  <p className="text-xs text-stone-400">
                    Measurable empirical proof of deterministic revenue recovery, AI diagnosis precision, and resiliency.
                  </p>
                </div>
              </div>

              {/* Run Info Metadata */}
              {report ? (
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-2 text-stone-400">
                  <span>Run ID: <strong className="text-amber-400">{report.runId}</strong></span>
                  <span>•</span>
                  <span>Dataset: <strong className="text-stone-200">{report.datasetSize} cases</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-stone-200">{report.durationMs}ms</strong></span>
                  <span>•</span>
                  <span>Completed: <strong className="text-stone-200">{formatDate(report.completedAt)}</strong></span>
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic pt-1">
                  Status: <span className="text-amber-400 font-medium">Not evaluated yet.</span> Click &quot;Run Evaluation&quot; to execute the benchmark suite.
                </p>
              )}
            </div>

            {/* Run Button */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="lg"
                onClick={handleRunEvaluation}
                disabled={runningEval}
                className="gap-2 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
              >
                {runningEval ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    Executing Benchmark...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-stone-950" />
                    Run Evaluation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <ErrorState title="Evaluation Error" message={error} onRetry={fetchLatestReport} />
      )}

      {loading && !report ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !report ? (
        <EmptyState
          title="Not Evaluated Yet"
          description="Click 'Run Evaluation' above to execute the benchmark evaluation across your payment failure dataset."
          actionLabel="Run Evaluation Now"
          onAction={handleRunEvaluation}
          className="py-16"
        />
      ) : (
        <div className="space-y-6">
          {/* 1. SYSTEM EVALUATION METRICS */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              1. System Evaluation & Algorithmic Precision
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Diagnosis Accuracy */}
              <Card className="p-4 bg-[#141720]">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Diagnosis Accuracy</span>
                  <MetricTooltip content="Percentage of payment failures correctly categorized by the deterministic failure classifier." />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {report.diagnosisAccuracyPercent}%
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">Root cause classification</p>
              </Card>

              {/* Recovery Precision */}
              <Card className="p-4 bg-[#141720]">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Recovery Precision</span>
                  <MetricTooltip content="Ratio of successful recoveries to total interventions initiated." />
                </div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {report.recoveryPrecisionPercent}%
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">Intervention accuracy</p>
              </Card>

              {/* False Intervention Rate */}
              <Card className="p-4 bg-[#141720]">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>False Intervention</span>
                  <MetricTooltip content="Interventions triggered on already-recovered payments or customer opt-outs (guaranteed ~0% by policy engine)." />
                </div>
                <div className="text-2xl font-bold font-mono text-stone-100 mt-1">
                  {report.falseInterventionRatePercent}%
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">Protected by policy gates</p>
              </Card>

              {/* Avg Recovery Time */}
              <Card className="p-4 bg-[#141720]">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Avg Recovery Time</span>
                  <MetricTooltip content="Average duration between payment failure detection and confirmed payment settlement." />
                </div>
                <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {report.averageRecoveryTimeHours}h
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">From detection to settlement</p>
              </Card>

              {/* Policy Blocks */}
              <Card className="p-4 bg-[#141720]">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Policy Violations Blocked</span>
                  <MetricTooltip content="Unsafe actions (e.g. unlimited retries, broken cooldowns) intercepted and blocked by the policy engine." />
                </div>
                <div className="text-2xl font-bold font-mono text-purple-400 mt-1">
                  {report.policyViolationAttemptsBlocked}
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">Deterministic rule gates</p>
              </Card>
            </div>
          </div>

          {/* 2. BUSINESS IMPACT METRICS */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              2. Business Impact & Revenue Retained
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Recovered */}
              <Card glow className="border-amber-500/30 bg-gradient-to-b from-[#181C26] to-[#13161C]">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-amber-400">
                    <span>Total Revenue Recovered</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    {formatINR(report.totalRevenueRecoveredPaise)}
                  </div>
                  <p className="text-xs text-stone-400">
                    <span className="text-emerald-400 font-semibold">{report.successfulRecoveriesCount}</span> successful recoveries
                  </p>
                </CardContent>
              </Card>

              {/* Total Revenue At Risk */}
              <Card className="border-rose-500/20 bg-[#141720]">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-rose-400">
                    <span>Total Revenue At Risk</span>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-stone-100">
                    {formatINR(report.totalRevenueAtRiskPaise)}
                  </div>
                  <p className="text-xs text-stone-400">
                    {report.casesProcessed} total cases evaluated
                  </p>
                </CardContent>
              </Card>

              {/* Recovery Percentage */}
              <Card className="border-blue-500/20 bg-[#141720]">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-blue-400">
                    <span>Recovery Percentage</span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-stone-100">
                    {report.recoveryPercentage}%
                  </div>
                  <p className="text-xs text-stone-400">Empirical benchmark conversion</p>
                </CardContent>
              </Card>

              {/* Average Recovered Amount */}
              <Card className="border-purple-500/20 bg-[#141720]">
                <CardContent className="p-5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-purple-400">
                    <span>Avg Recovered / Case</span>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold font-mono text-stone-100">
                    {formatINR(report.averageRecoveredAmountPaise)}
                  </div>
                  <p className="text-xs text-stone-400">Retained value per intervention</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 3. FAILURE RECOVERY & RESILIENCY METRICS */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              3. Failure Recovery & Fault Resiliency
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl bg-[#141720] border border-[#232733] space-y-1">
                <span className="text-[11px] text-stone-400 block">Webhook Duplicates:</span>
                <div className="text-xl font-bold font-mono text-amber-400">
                  {report.webhookDuplicatesHandled}
                </div>
                <p className="text-[10px] text-stone-400">Idempotency shield</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141720] border border-[#232733] space-y-1">
                <span className="text-[11px] text-stone-400 block">AI Faults Handled:</span>
                <div className="text-xl font-bold font-mono text-blue-400">
                  {report.aiFailuresHandled}
                </div>
                <p className="text-[10px] text-stone-400">Deterministic fallback</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141720] border border-[#232733] space-y-1">
                <span className="text-[11px] text-stone-400 block">Gateway 5xx Handled:</span>
                <div className="text-xl font-bold font-mono text-purple-400">
                  {report.razorpayApiFailuresHandled}
                </div>
                <p className="text-[10px] text-stone-400">Bounded retry</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141720] border border-[#232733] space-y-1">
                <span className="text-[11px] text-stone-400 block">Timeouts Handled:</span>
                <div className="text-xl font-bold font-mono text-rose-400">
                  {report.timeoutsHandled}
                </div>
                <p className="text-[10px] text-stone-400">Verification pending</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141720] border border-[#232733] space-y-1">
                <span className="text-[11px] text-stone-400 block">Duplicate Actions:</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {report.duplicateActionsPrevented}
                </div>
                <p className="text-[10px] text-stone-400">Zero double billing</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#141720] border border-[#232733] space-y-1">
                <span className="text-[11px] text-stone-400 block">Technical Recovery:</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {report.recoveredAfterTechnicalFailureCount}
                </div>
                <p className="text-[10px] text-stone-400">Saved after blip</p>
              </div>
            </div>
          </div>

          {/* 4. CATEGORY ACCURACY CHART & BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Accuracy Breakdown by Failure Category</CardTitle>
                <CardDescription>
                  Empirical classification and recovery rate across root cause categories
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.categoryBreakdown} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <XAxis type="number" stroke="#4B5563" fontSize={10} domain={[0, 100]} unit="%" />
                      <YAxis
                        dataKey="category"
                        type="category"
                        stroke="#9CA3AF"
                        fontSize={9}
                        width={110}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#181C24',
                          borderColor: '#282E3B',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#F3F4F6',
                        }}
                        formatter={(val) => [`${val}%`, 'Accuracy']}
                      />
                      <Bar dataKey="accuracyPercent" radius={[0, 4, 4, 0]}>
                        {report.categoryBreakdown.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Category Performance Matrix</CardTitle>
                <CardDescription>Cases processed vs successfully recovered</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                      <tr>
                        <th className="py-3 px-4 font-medium">Failure Category</th>
                        <th className="py-3 px-4 font-medium">Cases</th>
                        <th className="py-3 px-4 font-medium">Recovered</th>
                        <th className="py-3 px-4 font-medium text-right">Precision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E232E]">
                      {report.categoryBreakdown.map((cat) => (
                        <tr key={cat.category} className="hover:bg-[#181C24]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-semibold text-stone-200">
                            {cat.category}
                          </td>
                          <td className="py-3 px-4 font-mono text-stone-300">
                            {cat.totalCases}
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                            {cat.recoveredCases}
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-400 font-bold text-right">
                            {cat.accuracyPercent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
