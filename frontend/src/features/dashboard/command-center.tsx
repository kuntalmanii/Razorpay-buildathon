'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { DashboardSummary, MetricsSummary, RecoveryAction, RecoveryCaseSummary } from '@/types/api';
import { formatINR, formatDate, getStatusBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton, TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricTooltip } from '@/components/ui/tooltip';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  XCircle,
  ArrowUpRight,
  ShieldAlert,
  Bot,
  ScrollText,
  Radio,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';

export function CommandCenter() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [recentActions, setRecentActions] = useState<RecoveryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, metRes, actRes] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getMetrics(14),
        apiClient.getRecoveryActions({ page: 1, limit: 6 }),
      ]);
      setSummary(sumRes);
      setMetrics(metRes);
      setRecentActions(actRes.actions || actRes);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Filter critical high-risk cases (risk_score >= 70 or amount >= 1500000 paise)
  const criticalCases = useMemo(() => {
    return (summary?.recentCases || []).filter(
      (c) => c.risk_score >= 70 || c.amount_at_risk >= 1500000
    );
  }, [summary?.recentCases]);

  // Transform breakdown map into category chart array
  const categoryData = useMemo(() => {
    return Object.entries(summary?.breakdownByFailureCategory || {}).map(([name, value]) => ({
      category: name.replace(/_/g, ' ').toUpperCase(),
      cases: value,
    }));
  }, [summary?.breakdownByFailureCategory]);

  // Transform daily metrics breakdown for trend chart
  const trendData = useMemo(() => {
    return (metrics?.dailyBreakdown || []).map((d) => ({
      date: d.date.slice(5), // MM-DD format
      Recovered: d.recoveredPaise / 100,
      AtRisk: d.riskPaise / 100,
    }));
  }, [metrics?.dailyBreakdown]);

  const CATEGORY_COLORS = ['#B89A62', '#6F9B7A', '#71879A', '#B68B4F', '#B56F68', '#817A70'];

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Navigation Skeleton */}
        <div className="h-12 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />

        {/* Primary Overview Unified Bar Skeleton */}
        <div className="h-32 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-80 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        </div>

        {/* Operational Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-64 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Command Center Telemetry Unavailable"
        message={error}
        onRetry={fetchAllData}
      />
    );
  }

  if (!summary || !metrics) {
    return (
      <EmptyState
        title="No Telemetry Data Available"
        description="No revenue risk cases or recovery events have been recorded yet."
        actionLabel="Refresh Metrics"
        onAction={fetchAllData}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 1. Header & Operational Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#6F9B7A]" />
          <span className="text-xs font-semibold text-[#F2EDE3] tracking-tight">
            RecoverIQ Command Console
          </span>
          <span className="text-[11px] text-[#817A70] hidden sm:inline font-mono">
            • Gateway Telemetry Active
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Link href="/recovery-cases">
            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 h-7">
              <ShieldAlert className="w-3 h-3 mr-1 text-[#B89A62]" />
              Risk Cases
            </Button>
          </Link>
          <Link href="/ai-decisions">
            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 h-7">
              <Bot className="w-3 h-3 mr-1 text-[#71879A]" />
              AI Decisions
            </Button>
          </Link>
          <Link href="/audit">
            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 h-7">
              <ScrollText className="w-3 h-3 mr-1 text-[#817A70]" />
              Audit Trail
            </Button>
          </Link>
          <Link href="/evaluation">
            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 h-7">
              <Radio className="w-3 h-3 mr-1 text-[#6F9B7A]" />
              Evaluation
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAllData}
            aria-label="Refresh telemetry"
            className="h-7 w-7 p-0 ml-1 text-[#817A70] hover:text-[#F2EDE3]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 2. Primary Financial Overview (Cohesive Financial Terminal Panel) */}
      <div className="rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[rgba(242,237,227,0.08)]">
          {/* Metric 1: Revenue at Risk */}
          <div className="p-5 space-y-1.5 hover:bg-[#201F1B] transition-colors duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B56F68] font-medium flex items-center gap-1">
                Revenue at Risk
                <MetricTooltip content="Sum of invoice and payment amounts for all currently open or in-progress failure cases." />
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-[#B56F68]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] tracking-tight">
              {formatINR(summary.totalRevenueAtRiskPaise)}
            </div>
            <div className="text-[11px] text-[#817A70] flex items-center justify-between font-mono pt-1">
              <span>Unresolved exposure</span>
              <span className="text-[#B56F68] font-semibold">{summary.totalOpenCases} cases</span>
            </div>
          </div>

          {/* Metric 2: Revenue Recovered */}
          <div className="p-5 space-y-1.5 bg-[#1E1D19] hover:bg-[#22211C] transition-colors duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#B89A62] font-medium flex items-center gap-1">
                Revenue Recovered
                <MetricTooltip content="Total revenue successfully settled and verified through automated payment links and retries." />
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6F9B7A]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] tracking-tight">
              {formatINR(summary.totalRecoveredPaise)}
            </div>
            <div className="text-[11px] text-[#817A70] flex items-center justify-between font-mono pt-1">
              <span>Verified settlements</span>
              <span className="text-[#6F9B7A] font-semibold">{summary.totalRecoveredCases} saved</span>
            </div>
          </div>

          {/* Metric 3: Recovery Rate */}
          <div className="p-5 space-y-1.5 hover:bg-[#201F1B] transition-colors duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#71879A] font-medium flex items-center gap-1">
                Recovery Rate
                <MetricTooltip content="Percentage of diagnosed failure cases successfully recovered: (Recovered Cases / Total Processed) × 100." />
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-[#71879A]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] tracking-tight">
              {summary.recoveryRatePercent.toFixed(1)}%
            </div>
            <div className="text-[11px] text-[#817A70] flex items-center justify-between font-mono pt-1">
              <span>Success velocity</span>
              <span className="text-[#B7B0A3]">
                {summary.totalRecoveredCases} / {summary.totalOpenCases + summary.totalRecoveredCases} cases
              </span>
            </div>
          </div>

          {/* Metric 4: Active Cases & Failures */}
          <div className="p-5 space-y-1.5 hover:bg-[#201F1B] transition-colors duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#817A70] font-medium flex items-center gap-1">
                Active Cases
                <MetricTooltip content="Cases currently undergoing automated recovery workflow or scheduled retries." />
              </span>
              <Activity className="w-3.5 h-3.5 text-[#B68B4F]" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#F2EDE3] tracking-tight">
              {summary.totalOpenCases}
            </div>
            <div className="text-[11px] text-[#817A70] flex items-center justify-between font-mono pt-1">
              <span>Failed action rate</span>
              <span className="text-[#817A70]">{metrics.failedCount ?? 0} past 14d</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Risk & Recovery Analytics (Restrained Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
        {/* 14-Day Chronological Recovery Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recovery Performance Trend</CardTitle>
              <CardDescription>
                Chronological daily comparison of recovered revenue vs new exposure (Past 14 Days)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-[#D1B982]">
                <span className="w-2 h-2 rounded-full bg-[#B89A62] inline-block" /> Recovered (₹)
              </div>
              <div className="flex items-center gap-1.5 text-[#B56F68]">
                <span className="w-2 h-2 rounded-full bg-[#B56F68] inline-block" /> At Risk (₹)
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {trendData.length === 0 ? (
              <EmptyState
                title="No Trend Telemetry"
                description="Daily recovery breakdown will populate as webhook payment events arrive."
                className="py-12"
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B89A62" stopOpacity={0.20} />
                        <stop offset="95%" stopColor="#B89A62" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#B56F68" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#B56F68" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(242, 237, 227, 0.05)" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#817A70"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#817A70"
                      fontSize={11}
                      fontFamily="monospace"
                      tickLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1B18',
                        borderColor: 'rgba(242, 237, 227, 0.12)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        color: '#F2EDE3',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="Recovered"
                      stroke="#B89A62"
                      strokeWidth={1.75}
                      fillOpacity={1}
                      fill="url(#recoveredGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="AtRisk"
                      stroke="#B56F68"
                      strokeWidth={1.25}
                      strokeDasharray="3 3"
                      fillOpacity={1}
                      fill="url(#riskGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failure Category Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Root Cause Distribution</CardTitle>
            <CardDescription>Deterministic failure classification breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {categoryData.length === 0 ? (
              <EmptyState
                title="No Categories"
                description="Failure categories will appear as payments fail."
                className="py-12"
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid stroke="rgba(242, 237, 227, 0.04)" horizontal={false} />
                    <XAxis type="number" stroke="#817A70" fontSize={10} fontFamily="monospace" tickLine={false} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#B7B0A3"
                      fontSize={9}
                      fontFamily="monospace"
                      width={100}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1C1B18',
                        borderColor: 'rgba(242, 237, 227, 0.12)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: '#F2EDE3',
                        fontFamily: 'monospace',
                      }}
                    />
                    <Bar dataKey="cases" radius={[0, 3, 3, 0]}>
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Operational Row: Recent Recovery Activity & Critical Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-400">
        {/* Recent Recovery Activity Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recent Recovery Actions</CardTitle>
              <CardDescription>Live actions dispatched under deterministic policy</CardDescription>
            </div>
            <Link
              href="/ai-decisions"
              className="text-xs text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 font-mono transition-colors"
            >
              All Decisions <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentActions.length === 0 ? (
              <EmptyState
                title="No Recent Actions"
                description="Executed payment links, retries, and notifications will be logged here."
                className="m-4 py-8"
              />
            ) : (
              <div className="divide-y divide-[rgba(242,237,227,0.06)]">
                {recentActions.map((act) => (
                  <div
                    key={act.action_id}
                    className="p-3.5 hover:bg-[#24221E]/60 transition-colors duration-150 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-[#F2EDE3]">
                          {act.action_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <Badge variant={act.proposed_by === 'ai' ? 'gold' : 'blue'}>
                          {act.proposed_by}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-[#817A70]">
                        Case: {act.case_id.slice(0, 18)}...
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                          act.execution_status === 'completed'
                            ? 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/25'
                            : act.execution_status === 'failed'
                            ? 'bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/25'
                            : 'bg-[#B68B4F]/10 text-[#B68B4F] border-[#B68B4F]/25'
                        }`}
                      >
                        {act.execution_status}
                      </span>
                      <p className="text-[10px] font-mono text-[#817A70]">{formatDate(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Cases Requiring Urgency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Critical Exposure Cases</CardTitle>
              <CardDescription>
                High-value transactions or cases with severe failure probability (Risk ≥ 70)
              </CardDescription>
            </div>
            <Link
              href="/recovery-cases"
              className="text-xs text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 font-mono transition-colors"
            >
              Inspect Cases <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {criticalCases.length === 0 ? (
              <EmptyState
                title="No Critical Cases"
                description="Cases with high financial exposure or chronic failures will be highlighted here."
                className="m-4 py-8"
              />
            ) : (
              <div className="divide-y divide-[rgba(242,237,227,0.06)]">
                {criticalCases.map((c) => {
                  const badge = getStatusBadge(c.status);
                  return (
                    <div
                      key={c.case_id}
                      className="p-3.5 hover:bg-[#24221E]/60 transition-colors duration-150 flex items-center justify-between text-xs border-l-2 border-l-[#B56F68]/60"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/recovery-cases?id=${c.case_id}`}
                            className="font-mono font-medium text-[#D1B982] hover:underline"
                          >
                            {c.case_id.slice(0, 18)}...
                          </Link>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-[#817A70]">
                          {c.failure_category} • Risk: {c.risk_score}/100
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="font-mono font-bold text-[#F2EDE3] text-sm">
                          {formatINR(c.amount_at_risk)}
                        </div>
                        <p className="text-[10px] text-[#6F9B7A] font-mono">
                          {(c.recovery_probability * 100).toFixed(0)}% recovery prob.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
