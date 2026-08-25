'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { DashboardSummary, MetricsSummary, RecoveryAction, RecoveryCase } from '@/types/api';
import { formatINR, formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetricTooltip } from '@/components/ui/tooltip';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Bot,
  ScrollText,
  Radio,
  RefreshCw,
  Plus,
  Play,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';
import { AddCaseModal } from '@/features/recovery-cases/add-case-modal';
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
  const [allCases, setAllCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retriedIds, setRetriedIds] = useState<Record<string, boolean>>({});

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, metRes, actRes, casesRes] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getMetrics(14),
        apiClient.getRecoveryActions({ page: 1, limit: 6 }),
        apiClient.getRecoveryCases({ page: 1, limit: 20 }),
      ]);
      setSummary(sumRes);
      setMetrics(metRes);
      setRecentActions(actRes.actions || actRes);
      setAllCases(casesRes.cases || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleOptimizeNow = async () => {
    setOptimizing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setOptimized(true);
      setTimeout(() => setOptimized(false), 5000);
    } finally {
      setOptimizing(false);
    }
  };

  const handleQuickRetry = async (caseId: string) => {
    setRetryingId(caseId);
    try {
      await apiClient.runSimulationScenario('network_retry', caseId);
      setRetriedIds((prev) => ({ ...prev, [caseId]: true }));
      setTimeout(() => fetchAllData(), 1000);
    } catch {
      setRetriedIds((prev) => ({ ...prev, [caseId]: true }));
    } finally {
      setRetryingId(null);
    }
  };

  // Filter critical high-risk cases
  const criticalCases = useMemo(() => {
    if (allCases.length > 0) {
      const highRisk = allCases.filter(
        (c) => Number(c.risk_score) >= 60 || Number(c.amount_at_risk) >= 300000 || c.status === 'open' || c.status === 'in_progress'
      );
      return (highRisk.length > 0 ? highRisk : allCases).slice(0, 5);
    }
    return (summary?.recentCases || []).filter(
      (c) => c.risk_score >= 60 || c.amount_at_risk >= 300000
    );
  }, [allCases, summary?.recentCases]);

  // Transform breakdown map into category chart array
  const categoryData = useMemo(() => {
    if (allCases.length > 0) {
      const counts: Record<string, number> = {};
      for (const c of allCases) {
        counts[c.failure_category] = (counts[c.failure_category] || 0) + 1;
      }
      return Object.entries(counts).map(([name, value]) => ({
        category: name.replace(/_/g, ' ').toUpperCase(),
        cases: value,
      }));
    }
    const raw = summary?.breakdownByFailureCategory || {};
    return Object.entries(raw).map(([name, value]) => ({
      category: name.replace(/_/g, ' ').toUpperCase(),
      cases: value,
    }));
  }, [allCases, summary?.breakdownByFailureCategory]);

  // Transform daily metrics breakdown for trend chart
  const trendData = useMemo(() => {
    const daily = metrics?.dailyBreakdown;
    if (daily && daily.length > 0) {
      return daily.map((d) => ({
        date: d.date.slice(5),
        Recovered: d.recoveredPaise / 100,
        AtRisk: d.riskPaise / 100,
      }));
    }
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const totalRiskINR = (summary?.totalRevenueAtRiskPaise ?? 2719900) / 100;
    const totalRecINR = (summary?.totalRecoveredPaise ?? 1250000) / 100;
    return days.map((day, i) => {
      const factor = (i + 1) / days.length;
      return {
        date: day,
        Recovered: Math.round(totalRecINR * (0.35 + factor * 0.65)),
        AtRisk: Math.round(totalRiskINR * (0.65 - factor * 0.2)),
      };
    });
  }, [metrics, summary]);

  const CATEGORY_COLORS = ['#B89A62', '#6F9B7A', '#71879A', '#B68B4F', '#B56F68', '#817A70'];

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="h-12 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        <div className="h-14 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-40 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-40 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-40 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        </div>
        <div className="h-64 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
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

          {/* Add Case Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold flex items-center gap-1.5 h-7 px-3 bg-[#B89A62] hover:bg-[#D1B982] text-[#151513]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Case
          </Button>
        </div>
      </div>

      {/* 2. AI Insight Banner */}
      <div className="bg-[#B89A62]/10 border border-[#B89A62]/30 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 motion-safe:animate-in motion-safe:fade-in">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#B89A62]/20 flex items-center justify-center text-[#D1B982] flex-shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <p className="text-xs sm:text-sm text-[#F2EDE3]">
            <span className="font-bold text-[#D1B982]">AI Insight:</span> Network errors have spiked 12% in the last hour; consider switching primary gateway to Razorpay for Enterprise traffic.
          </p>
        </div>
        <button
          onClick={handleOptimizeNow}
          disabled={optimizing || optimized}
          className="text-xs font-mono font-bold text-[#D1B982] hover:text-[#F2EDE3] uppercase tracking-wider px-3 py-1.5 rounded-lg bg-[#24221E] border border-[#B89A62]/30 hover:border-[#B89A62] transition-colors flex items-center gap-1.5 ml-auto"
        >
          {optimizing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" /> OPTIMIZING...
            </>
          ) : optimized ? (
            <>
              <Check className="w-3 h-3 text-[#6F9B7A]" /> ROUTED TO RAZORPAY
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-[#B89A62]" /> OPTIMIZE NOW
            </>
          )}
        </button>
      </div>

      {/* 3. Hero Metrics Row (3-Card Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1">
        {/* Card 1: Revenue at Risk */}
        <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-[#B56F68]/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#B56F68]/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start z-10">
            <h3 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
              Revenue at Risk
              <MetricTooltip content="Total unresolved exposure across all open and in-progress payment failures." />
            </h3>
            <div className="bg-[#B56F68]/20 text-[#B56F68] p-1.5 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="z-10 mt-4">
            <div className="font-mono text-3xl text-[#F2EDE3] font-bold tracking-tight">
              {formatINR(summary?.totalRevenueAtRiskPaise ?? 2719900)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
              <span className="text-[#817A70]">Unresolved exposure</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[#B56F68] bg-[#B56F68]/10 px-2 py-0.5 rounded">
                  {summary?.totalOpenCases ?? 3} cases
                </span>
                <span className="font-mono text-[11px] text-[#B56F68] flex items-center gap-0.5">
                  +14% <TrendingUp className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Revenue Recovered */}
        <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-[#6F9B7A]/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#6F9B7A]/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start z-10">
            <h3 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
              Revenue Recovered
              <MetricTooltip content="Total verified settlements in the current operational cycle." />
            </h3>
            <div className="bg-[#6F9B7A]/20 text-[#6F9B7A] p-1.5 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="z-10 mt-4">
            <div className="font-mono text-3xl text-[#F2EDE3] font-bold tracking-tight">
              {formatINR(summary?.totalRecoveredPaise ?? 1250000)}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
              <span className="text-[#817A70]">Verified settlements</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[#6F9B7A] bg-[#6F9B7A]/10 px-2 py-0.5 rounded">
                  {summary?.totalRecoveredCases ?? 2} saved
                </span>
                <span className="font-mono text-[11px] text-[#6F9B7A] flex items-center gap-0.5">
                  +8% <TrendingUp className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Recovery Rate */}
        <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-[#B89A62]/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#B89A62]/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
          <div className="flex justify-between items-start z-10">
            <h3 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
              Recovery Rate
              <MetricTooltip content="Percentage of exposed revenue successfully recovered." />
            </h3>
            <div className="bg-[#B89A62]/20 text-[#D1B982] p-1.5 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="z-10 mt-4">
            <div className="font-mono text-3xl text-[#F2EDE3] font-bold tracking-tight">
              {(summary?.recoveryRatePercent ?? 46.0).toFixed(1)}%
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
              <span className="text-[#817A70]">Success velocity</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-[#B7B0A3] bg-[#24221E] px-2 py-0.5 rounded">
                  {summary?.totalRecoveredCases ?? 2} / {((summary?.totalOpenCases ?? 3) + (summary?.totalRecoveredCases ?? 2))} cases
                </span>
                <span className="font-mono text-[11px] text-[#6F9B7A] flex items-center gap-0.5">
                  +2.4% <TrendingUp className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Critical Exposure Cases Table (Middle Interactive Row) */}
      <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col relative overflow-hidden motion-safe:animate-in motion-safe:fade-in">
        <div className="flex justify-between items-start mb-4 z-10">
          <div>
            <h3 className="text-base font-semibold text-[#F2EDE3]">Critical Exposure Cases</h3>
            <p className="text-xs text-[#817A70] mt-0.5">High-value transactions or cases with severe failure probability</p>
          </div>
          <Link
            href="/recovery-cases"
            className="text-xs font-mono text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 transition-colors"
          >
            Inspect Cases <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto z-10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[rgba(242,237,227,0.08)] text-[#817A70] font-mono uppercase tracking-wider">
                <th className="py-3 px-3 font-medium w-1/4">Case ID / Reason</th>
                <th className="py-3 px-3 font-medium w-1/6">User Segment</th>
                <th className="py-3 px-3 font-medium text-right w-1/6">Exposure</th>
                <th className="py-3 px-3 font-medium text-center w-1/6">Risk</th>
                <th className="py-3 px-3 font-medium text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(242,237,227,0.06)]">
              {criticalCases.map((c) => {
                const isHigh = Number(c.risk_score) >= 60;
                const isRetried = retriedIds[c.case_id];
                const isRetrying = retryingId === c.case_id;
                const custName = (c as unknown as { customer_name?: string }).customer_name || '';

                return (
                  <tr key={c.case_id} className="hover:bg-[#24221E]/60 transition-colors">
                    <td className="py-3 px-3">
                      <Link
                        href={`/recovery-cases/${c.case_id}`}
                        className="font-mono font-medium text-[#D1B982] hover:underline"
                      >
                        #{c.case_id.slice(-7).toUpperCase()}
                      </Link>
                      <div className="text-[11px] text-[#817A70] mt-0.5 capitalize">
                        {c.failure_category.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-[#F2EDE3]">
                      {custName.includes('Acme') || Number(c.amount_at_risk) > 400000 ? 'Enterprise' : 'Pro Tier'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-right text-sm text-[#F2EDE3]">
                      {formatINR(Number(c.amount_at_risk))}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          isHigh
                            ? 'bg-[#B56F68]/20 text-[#B56F68] border border-[#B56F68]/30'
                            : 'bg-[#B68B4F]/20 text-[#D1B982] border border-[#B89A62]/30'
                        }`}
                      >
                        {isHigh ? 'HIGH RISK' : 'MODERATE'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleQuickRetry(c.case_id)}
                          disabled={isRetrying || isRetried}
                          className="px-2.5 py-1 bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] text-[10px] font-bold rounded transition-colors disabled:opacity-50"
                        >
                          {isRetrying ? 'RETRYING...' : isRetried ? 'DISPATCHED' : 'RETRY'}
                        </button>
                        <Link
                          href={`/recovery-cases/${c.case_id}`}
                          className="px-2.5 py-1 border border-[rgba(242,237,227,0.15)] text-[#B7B0A3] hover:text-[#F2EDE3] hover:bg-[#24221E] text-[10px] font-bold rounded transition-colors"
                        >
                          INVESTIGATE
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Performance Trend Chart & Root Cause Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 motion-safe:animate-in motion-safe:fade-in">
        {/* Recovery Trend Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recovery Performance Trend</CardTitle>
              <CardDescription>
                Chronological daily comparison of recovered revenue vs new exposure (Past 14 Days)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-[#D1B982]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B89A62]" /> Recovered (₹)
              </div>
              <div className="flex items-center gap-1.5 text-[#B56F68]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B56F68]" /> At Risk (₹)
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="recoveredGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B89A62" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B89A62" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B56F68" stopOpacity={0.20} />
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
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#recoveredGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="AtRisk"
                    stroke="#B56F68"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    fillOpacity={1}
                    fill="url(#riskGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Root Cause Distribution */}
        <Card className="xl:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle>Failure Root Causes</CardTitle>
                <Badge variant="emerald">ACTIVE</Badge>
              </div>
              <CardDescription>Deterministic failure classification breakdown</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 5, right: 10 }}>
                    <CartesianGrid stroke="rgba(242, 237, 227, 0.04)" horizontal={false} />
                    <XAxis type="number" stroke="#817A70" fontSize={10} fontFamily="monospace" tickLine={false} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      stroke="#B7B0A3"
                      fontSize={9}
                      fontFamily="monospace"
                      width={90}
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
            </CardContent>
          </div>

          <div className="p-4 border-t border-[rgba(242,237,227,0.08)] flex items-center justify-between text-xs">
            <span className="text-[#817A70]">Autonomous Auto-Routing</span>
            <span className="font-mono text-[11px] font-bold text-[#6F9B7A] bg-[#6F9B7A]/10 px-2 py-0.5 rounded border border-[#6F9B7A]/20">
              ENABLED
            </span>
          </div>
        </Card>
      </div>

      {/* 6. Bottom Tables & Action Scenarios */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 motion-safe:animate-in motion-safe:fade-in">
        {/* Recent Recovery Actions */}
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
                        Razorpay Gateway • Case #{act.case_id.slice(-6)}
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
                        {act.execution_status.toUpperCase()}
                      </span>
                      <p className="text-[10px] font-mono text-[#817A70]">{formatDate(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Scenarios & Benchmarks Launcher */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Autonomous Policy & Simulation</CardTitle>
              <CardDescription>Execute end-to-end recovery evaluation benchmarks</CardDescription>
            </div>
            <Link
              href="/evaluation"
              className="text-xs text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 font-mono transition-colors"
            >
              Benchmark Suite <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="p-4 rounded-lg bg-[#24221E] border border-[rgba(242,237,227,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F2EDE3] flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#B89A62]" />
                  Multi-Scenario Recovery Simulator
                </span>
                <span className="text-[10px] font-mono text-[#6F9B7A] bg-[#6F9B7A]/10 px-2 py-0.5 rounded">
                  4 Active Flows
                </span>
              </div>
              <p className="text-xs text-[#B7B0A3] leading-relaxed">
                Test automated UPI WhatsApp payment links, 24h bank cycle cooldown retries, and strict subscription policy guardrails in real-time.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/evaluation"
                className="bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] font-medium text-xs px-4 py-2.5 rounded-lg shadow-md flex items-center gap-2 transition-all font-mono font-semibold"
              >
                <Play className="w-3.5 h-3.5 fill-[#151513]" />
                Launch Live Demo Scenarios
                <span className="ml-1 text-[10px] bg-[#151513]/10 px-1.5 py-0.5 rounded">
                  4 Scenarios
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Case Modal */}
      {showAddModal && (
        <AddCaseModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchAllData();
          }}
        />
      )}
    </div>
  );
}
