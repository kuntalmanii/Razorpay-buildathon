'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { DashboardSummary, MetricsSummary, RecoveryAction, RecoveryCase } from '@/types/api';
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
  Zap,
  RefreshCw,
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
      setRecentActions(actRes.actions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-xl bg-[#13161C] border border-[#232733]" />
          <div className="h-80 rounded-xl bg-[#13161C] border border-[#232733]" />
        </div>

        {/* Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-xl bg-[#13161C] border border-[#232733]" />
          <div className="h-64 rounded-xl bg-[#13161C] border border-[#232733]" />
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

  // Filter critical cases (risk_score >= 70 or amount >= 1500000 paise)
  const criticalCases = (summary.recentCases || []).filter(
    (c) => c.risk_score >= 70 || c.amount_at_risk >= 1500000
  );

  // Transform breakdown map into category chart array
  const categoryData = Object.entries(summary.breakdownByFailureCategory || {}).map(
    ([name, value]) => ({
      category: name.replace(/_/g, ' ').toUpperCase(),
      cases: value,
    })
  );

  // Transform daily metrics breakdown for trend chart
  const trendData = (metrics.dailyBreakdown || []).map((d) => ({
    date: d.date.slice(5), // MM-DD format
    Recovered: d.recoveredPaise / 100,
    AtRisk: d.riskPaise / 100,
  }));

  const CATEGORY_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Quick Navigation Action Hub */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#13161C] border border-[#232733]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-stone-200">
            RecoverIQ Autonomous Command Center
          </span>
          <span className="text-[11px] text-stone-400 hidden sm:inline">
            • Real-time Razorpay webhook telemetry
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/recovery-cases">
            <Button variant="outline" size="sm" className="text-xs">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-400" />
              Risk Cases
            </Button>
          </Link>
          <Link href="/ai-decisions">
            <Button variant="outline" size="sm" className="text-xs">
              <Bot className="w-3.5 h-3.5 mr-1 text-blue-400" />
              AI Decisions
            </Button>
          </Link>
          <Link href="/audit">
            <Button variant="outline" size="sm" className="text-xs">
              <ScrollText className="w-3.5 h-3.5 mr-1 text-purple-400" />
              Audit Trail
            </Button>
          </Link>
          <Link href="/evaluation">
            <Button variant="outline" size="sm" className="text-xs">
              <Radio className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Webhook Simulator
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={fetchAllData} aria-label="Refresh telemetry">
            <RefreshCw className="w-3.5 h-3.5 text-stone-400 hover:text-stone-200" />
          </Button>
        </div>
      </div>

      {/* 5 Core Top-Level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Revenue At Risk */}
        <Card className="border-rose-500/20 bg-gradient-to-b from-[#151922] to-[#111319]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs font-medium uppercase tracking-wider text-rose-400">
                <span>Revenue at Risk</span>
                <MetricTooltip content="Sum of invoice/order amounts for all currently open or unresolved failure cases." />
              </div>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-stone-100">
              {formatINR(summary.totalRevenueAtRiskPaise)}
            </div>
            <p className="text-[11px] text-stone-400">
              <span className="text-rose-400 font-semibold">{summary.totalOpenCases}</span> active
              unresolved cases
            </p>
          </CardContent>
        </Card>

        {/* 2. Revenue Recovered */}
        <Card glow className="border-amber-500/30 bg-gradient-to-b from-[#181C26] to-[#13161C]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs font-medium uppercase tracking-wider text-amber-400">
                <span>Revenue Recovered</span>
                <MetricTooltip content="Total revenue successfully captured and verified through recovery payment links and retries." />
              </div>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-stone-100">
              {formatINR(summary.totalRecoveredPaise)}
            </div>
            <p className="text-[11px] text-stone-400">
              <span className="text-emerald-400 font-semibold">{summary.totalRecoveredCases}</span>{' '}
              cases saved
            </p>
          </CardContent>
        </Card>

        {/* 3. Recovery Rate */}
        <Card className="border-blue-500/20 bg-gradient-to-b from-[#151922] to-[#111319]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs font-medium uppercase tracking-wider text-blue-400">
                <span>Recovery Rate</span>
                <MetricTooltip content="Percentage of diagnosed risk cases successfully resolved: (Recovered Cases / Total Cases) × 100." />
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-stone-100">
              {summary.recoveryRatePercent.toFixed(1)}%
            </div>
            <p className="text-[11px] text-stone-400">
              {summary.totalRecoveredCases} of {summary.totalOpenCases + summary.totalRecoveredCases}{' '}
              total cases
            </p>
          </CardContent>
        </Card>

        {/* 4. Active Recovery Cases */}
        <Card className="border-purple-500/20 bg-gradient-to-b from-[#151922] to-[#111319]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs font-medium uppercase tracking-wider text-purple-400">
                <span>Active Cases</span>
                <MetricTooltip content="Count of cases currently undergoing automated recovery workflow or scheduled retries." />
              </div>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Activity className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-stone-100">
              {summary.totalOpenCases}
            </div>
            <p className="text-[11px] text-stone-400">Open or in-progress</p>
          </CardContent>
        </Card>

        {/* 5. Failed Actions */}
        <Card className="border-stone-700/40 bg-gradient-to-b from-[#151922] to-[#111319]">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs font-medium uppercase tracking-wider text-stone-400">
                <span>Failed Actions</span>
                <MetricTooltip content="Recovery actions that resulted in terminal gateway errors or customer opt-outs." />
              </div>
              <div className="w-7 h-7 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400">
                <XCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold font-mono text-stone-100">{metrics.failedCount}</div>
            <p className="text-[11px] text-stone-400">Past 14 days telemetry</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row: 6. Recovery Trend Chart & 7. Revenue-At-Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6. 14-Day Chronological Recovery Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Revenue Recovery Trend (14 Days)</CardTitle>
              <CardDescription>
                Chronological comparison of daily recovered amount vs new revenue at risk
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Recovered (₹)
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> At Risk (₹)
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            {trendData.length === 0 ? (
              <EmptyState
                title="No Trend Data"
                description="Daily breakdown will appear once webhook payment events arrive."
                className="py-12"
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#6B7280"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#13161C',
                        borderColor: '#282E3B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F3F4F6',
                      }}
                      formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Area
                      type="monotone"
                      dataKey="Recovered"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#recoveredGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="AtRisk"
                      stroke="#EF4444"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#riskGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7. Failure Category Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Revenue-at-Risk Breakdown</CardTitle>
            <CardDescription>Deterministic classification of failure root causes</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
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
                    <XAxis type="number" stroke="#4B5563" fontSize={10} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#9CA3AF"
                      fontSize={9}
                      width={105}
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
                    />
                    <Bar dataKey="cases" radius={[0, 4, 4, 0]}>
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

      {/* Operational Row: 8. Recent Recovery Activity & 9. Critical Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 8. Recent Recovery Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Recovery Activity</CardTitle>
              <CardDescription>Live actions executed through the 10-step protocol</CardDescription>
            </div>
            <Link
              href="/ai-decisions"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
            >
              All Actions <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentActions.length === 0 ? (
              <EmptyState
                title="No Recent Actions"
                description="Executed payment links, retries, and escalations will be logged here."
                className="m-4 py-8"
              />
            ) : (
              <div className="divide-y divide-[#1E232E]">
                {recentActions.map((act) => (
                  <div
                    key={act.action_id}
                    className="p-3.5 hover:bg-[#181C24]/50 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-stone-200">
                          {act.action_type}
                        </span>
                        <Badge variant={act.proposed_by === 'ai' ? 'gold' : 'blue'}>
                          {act.proposed_by}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-stone-400">
                        Case: {act.case_id.slice(0, 18)}...
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          act.execution_status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {act.execution_status}
                      </span>
                      <p className="text-[10px] text-stone-400">{formatDate(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 9. Critical Cases Requiring Urgency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Critical High-Risk Cases</CardTitle>
              <CardDescription>
                High-value transactions or cases with severe failure probability (Risk ≥ 70)
              </CardDescription>
            </div>
            <Link
              href="/recovery-cases"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
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
              <div className="divide-y divide-[#1E232E]">
                {criticalCases.map((c) => {
                  const badge = getStatusBadge(c.status);
                  return (
                    <div
                      key={c.case_id}
                      className="p-3.5 hover:bg-[#181C24]/50 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/recovery-cases?id=${c.case_id}`}
                            className="font-mono font-semibold text-amber-400 hover:underline"
                          >
                            {c.case_id.slice(0, 18)}...
                          </Link>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-stone-400">
                          {c.failure_category} • Risk: {c.risk_score}/100
                        </p>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="font-mono font-bold text-stone-100 text-sm">
                          {formatINR(c.amount_at_risk)}
                        </div>
                        <p className="text-[10px] text-emerald-400 font-mono">
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
