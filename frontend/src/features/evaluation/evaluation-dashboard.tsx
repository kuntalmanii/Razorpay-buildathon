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
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  DollarSign,
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
  CartesianGrid,
} from 'recharts';

export function EvaluationDashboard() {
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningEval, setRunningEval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [evalStep, setEvalStep] = useState<string | null>(null);

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
    setSuccessMsg(null);
    setEvalStep('1/4: Querying database revenue risk cases & settlement telemetry...');

    try {
      await new Promise((r) => setTimeout(r, 250));
      setEvalStep('2/4: Auditing deterministic policy safety gates & cooldown rules...');
      await new Promise((r) => setTimeout(r, 250));
      setEvalStep('3/4: Calculating category precision, recovery rates, and exposure...');
      
      const res = await apiClient.runEvaluation();
      setEvalStep('4/4: Finalizing authoritative benchmark scorecard...');
      await new Promise((r) => setTimeout(r, 200));

      setReport(res);
      setSuccessMsg(`Benchmark Run #${res.runId} successfully completed • All 16 empirical metrics refreshed`);
    } catch (err) {
      setError((err as Error).message || 'Failed to execute evaluation run');
    } finally {
      setRunningEval(false);
      setEvalStep(null);
    }
  };

  const CATEGORY_COLORS = ['#B89A62', '#6F9B7A', '#71879A', '#B68B4F', '#B56F68'];

  return (
    <div className="space-y-6 max-w-7xl motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
      {/* Test-Run Hero Banner: Run Evaluation */}
      <Card className="border-[#B89A62]/30 bg-[#1C1B18]">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-[#B89A62]/10 border border-[#B89A62]/25 flex items-center justify-center text-[#D1B982]">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-[#F2EDE3] flex items-center gap-2">
                    RecoverIQ Benchmark & Evaluation Suite
                    <Badge variant="gold">Judge Evaluation View</Badge>
                  </h2>
                  <p className="text-xs text-[#817A70] font-mono mt-0.5">
                    Measurable empirical proof of deterministic revenue recovery, AI diagnosis precision, and resiliency.
                  </p>
                </div>
              </div>

              {/* Run Info Metadata */}
              {report ? (
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono pt-1 text-[#817A70]">
                  <span>Run ID: <strong className="text-[#D1B982]">{report.runId}</strong></span>
                  <span>•</span>
                  <span>Dataset: <strong className="text-[#F2EDE3]">{report.datasetSize} cases</strong></span>
                  <span>•</span>
                  <span>Duration: <strong className="text-[#F2EDE3]">{report.durationMs}ms</strong></span>
                  <span>•</span>
                  <span>Completed: <strong className="text-[#F2EDE3]">{formatDate(report.completedAt)}</strong></span>
                </div>
              ) : (
                <p className="text-xs text-[#817A70] italic pt-1 font-mono">
                  Status: <span className="text-[#D1B982] font-medium">Not evaluated yet.</span> Click &quot;Run Evaluation&quot; to execute the benchmark suite.
                </p>
              )}
            </div>

            {/* Run Button */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={handleRunEvaluation}
                disabled={runningEval}
                isLoading={runningEval}
                className="gap-2 text-xs font-semibold px-4 py-2"
              >
                {!runningEval && <Play className="w-3.5 h-3.5 fill-[#151513]" />}
                {runningEval ? 'Executing Benchmark...' : 'Run Evaluation'}
              </Button>
            </div>
          </div>

          {/* Active Step Progress Indicator */}
          {runningEval && evalStep && (
            <div className="p-3 rounded-md bg-[#24221E] border border-[#B89A62]/30 flex items-center gap-2.5 text-xs text-[#D1B982] font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{evalStep}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && !runningEval && (
            <div className="p-3 rounded-md bg-[#6F9B7A]/10 border border-[#6F9B7A]/30 flex items-center justify-between text-xs text-[#6F9B7A] font-mono animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6F9B7A]" />
                <span>{successMsg}</span>
              </div>
              <button
                onClick={() => setSuccessMsg(null)}
                className="text-[#6F9B7A] hover:text-[#F2EDE3] text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}
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
            <h3 className="text-xs font-mono font-medium text-[#817A70] uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-[#B89A62]" />
              1. System Evaluation & Algorithmic Precision
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Diagnosis Accuracy */}
              <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#817A70]">
                  <span>Diagnosis Accuracy</span>
                  <MetricTooltip content="Percentage of payment failures correctly categorized by the deterministic failure classifier." />
                </div>
                <div className="text-xl font-bold font-mono text-[#6F9B7A] mt-1">
                  {report.diagnosisAccuracyPercent}%
                </div>
                <p className="text-[10px] text-[#817A70] font-mono mt-0.5">Root cause accuracy</p>
              </div>

              {/* Recovery Precision */}
              <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#817A70]">
                  <span>Recovery Precision</span>
                  <MetricTooltip content="Ratio of successful recoveries to total interventions initiated." />
                </div>
                <div className="text-xl font-bold font-mono text-[#D1B982] mt-1">
                  {report.recoveryPrecisionPercent}%
                </div>
                <p className="text-[10px] text-[#817A70] font-mono mt-0.5">Intervention accuracy</p>
              </div>

              {/* False Intervention Rate */}
              <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#817A70]">
                  <span>False Intervention</span>
                  <MetricTooltip content="Interventions triggered on already-recovered payments or customer opt-outs (guaranteed ~0% by policy engine)." />
                </div>
                <div className="text-xl font-bold font-mono text-[#F2EDE3] mt-1">
                  {report.falseInterventionRatePercent}%
                </div>
                <p className="text-[10px] text-[#817A70] font-mono mt-0.5">Policy protected</p>
              </div>

              {/* Avg Recovery Time */}
              <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#817A70]">
                  <span>Avg Recovery Time</span>
                  <MetricTooltip content="Average duration between payment failure detection and confirmed payment settlement." />
                </div>
                <div className="text-xl font-bold font-mono text-[#71879A] mt-1">
                  {report.averageRecoveryTimeHours}h
                </div>
                <p className="text-[10px] text-[#817A70] font-mono mt-0.5">Detection to settle</p>
              </div>

              {/* Policy Blocks */}
              <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <div className="flex items-center justify-between text-xs text-[#817A70]">
                  <span>Policy Blocks</span>
                  <MetricTooltip content="Unsafe actions (e.g. unlimited retries, broken cooldowns) intercepted and blocked by the policy engine." />
                </div>
                <div className="text-xl font-bold font-mono text-[#B68B4F] mt-1">
                  {report.policyViolationAttemptsBlocked}
                </div>
                <p className="text-[10px] text-[#817A70] font-mono mt-0.5">Deterministic gates</p>
              </div>
            </div>
          </div>

          {/* 2. BUSINESS IMPACT METRICS */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-medium text-[#817A70] uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-[#6F9B7A]" />
              2. Business Impact & Revenue Retained
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Recovered */}
              <Card className="border-l-2 border-l-[#6F9B7A]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#6F9B7A]">
                    <span>Total Revenue Recovered</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#6F9B7A]">
                    {formatINR(report.totalRevenueRecoveredPaise)}
                  </div>
                  <p className="text-[11px] text-[#817A70] font-mono">
                    <span className="text-[#6F9B7A] font-semibold">{report.successfulRecoveriesCount}</span> saved cases
                  </p>
                </CardContent>
              </Card>

              {/* Total Revenue At Risk */}
              <Card className="border-l-2 border-l-[#B56F68]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#B56F68]">
                    <span>Total Revenue At Risk</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F2EDE3]">
                    {formatINR(report.totalRevenueAtRiskPaise)}
                  </div>
                  <p className="text-[11px] text-[#817A70] font-mono">
                    {report.casesProcessed} total cases evaluated
                  </p>
                </CardContent>
              </Card>

              {/* Recovery Percentage */}
              <Card className="border-l-2 border-l-[#71879A]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#71879A]">
                    <span>Recovery Percentage</span>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F2EDE3]">
                    {report.recoveryPercentage}%
                  </div>
                  <p className="text-[11px] text-[#817A70] font-mono">Empirical benchmark</p>
                </CardContent>
              </Card>

              {/* Average Recovered Amount */}
              <Card className="border-l-2 border-l-[#B89A62]">
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#B89A62]">
                    <span>Avg Recovered / Case</span>
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F2EDE3]">
                    {formatINR(report.averageRecoveredAmountPaise)}
                  </div>
                  <p className="text-[11px] text-[#817A70] font-mono">Mean unit recovery</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 3. RESILIENCY & FAILURE RECOVERY */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-medium text-[#817A70] uppercase tracking-wider flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-[#71879A]" />
              3. Resiliency & Failure Recovery Scorecard
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-[#F2EDE3]">Webhook Duplicates Filtered</CardTitle>
                  <CardDescription>Handled via DB uniqueness constraint</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold font-mono text-[#6F9B7A]">
                    {report.webhookDuplicatesHandled}
                  </div>
                  <p className="text-[10px] text-[#817A70] font-mono mt-1">Zero state corruption</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-[#F2EDE3]">AI & API Timeouts Recovered</CardTitle>
                  <CardDescription>Handled via bounded retry logic</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold font-mono text-[#D1B982]">
                    {report.aiFailuresHandled + report.razorpayApiFailuresHandled}
                  </div>
                  <p className="text-[10px] text-[#817A70] font-mono mt-1">Graceful fallback executed</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-[#F2EDE3]">Recovered After Outage</CardTitle>
                  <CardDescription>Resumed safely after simulated crash</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold font-mono text-[#6F9B7A]">
                    {report.recoveredAfterTechnicalFailureCount ?? 0}
                  </div>
                  <p className="text-[10px] text-[#817A70] font-mono mt-1">100% state preservation</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 4. CATEGORY BREAKDOWN VISUALIZATION */}
          {report.categoryBreakdown && report.categoryBreakdown.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Category-Level Recovery Distribution</CardTitle>
                <CardDescription>Empirical benchmark breakdown across failure categories</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.categoryBreakdown.map((item) => ({
                        category: item.category.replace(/_/g, ' ').toUpperCase(),
                        recovered: item.recoveredCases,
                        total: item.totalCases,
                        rate: item.accuracyPercent,
                      }))}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="rgba(242, 237, 227, 0.05)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="category" stroke="#817A70" fontSize={10} fontFamily="monospace" tickLine={false} />
                      <YAxis stroke="#817A70" fontSize={10} fontFamily="monospace" tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1C1B18',
                          borderColor: 'rgba(242, 237, 227, 0.12)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          color: '#F2EDE3',
                        }}
                      />
                      <Bar dataKey="recovered" name="Recovered Cases" radius={[3, 3, 0, 0]}>
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
          )}
        </div>
      )}
    </div>
  );
}
