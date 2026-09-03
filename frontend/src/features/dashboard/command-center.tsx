'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  DashboardSummary,
  MetricsSummary,
  RecoveryAction,
  RecoveryCase,
  AuditLog,
} from '@/types/api';
import { ErrorState } from '@/components/ui/error-state';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  ArrowUpRight,
  Zap,
  Play,
} from 'lucide-react';

// New Modular User Dashboard Components
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { FinancialOverview } from '@/components/dashboard/financial-overview';
import { RecoveryPulse } from '@/components/dashboard/recovery-pulse';
import { AttentionRequired } from '@/components/dashboard/attention-required';
import { AiRecommendations } from '@/components/dashboard/ai-recommendations';
import { RecentActivityFeed } from '@/components/dashboard/recent-activity-feed';

export function CommandCenter() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [recentActions, setRecentActions] = useState<RecoveryAction[]>([]);
  const [allCases, setAllCases] = useState<RecoveryCase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedPulseStage, setSelectedPulseStage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [sumRes, metRes, actRes, casesRes, auditRes] = await Promise.all([
        apiClient.getDashboardSummary(),
        apiClient.getMetrics(14).catch(() => null),
        apiClient.getRecoveryActions({ page: 1, limit: 25 }).catch(() => ({ actions: [] })),
        apiClient.getRecoveryCases({ page: 1, limit: 50 }).catch(() => ({ cases: [] })),
        apiClient.getAuditLogs({ page: 1, limit: 10 }).catch(() => ({ logs: [] })),
      ]);

      setSummary(sumRes);
      if (metRes) setMetrics(metRes);
      setRecentActions(actRes.actions || actRes || []);
      setAllCases(casesRes.cases || []);
      setAuditLogs(auditRes.logs || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleQuickRetry = async (caseId: string) => {
    try {
      await apiClient.runSimulationScenario('network_retry', caseId);
      setTimeout(() => fetchAllData(true), 800);
    } catch {
      // Handled in child component state
    }
  };

  // Filter cases if user clicks a pulse stage
  const displayedCases = useMemo(() => {
    if (!selectedPulseStage) return allCases;

    if (selectedPulseStage === 'recovered') {
      return allCases.filter((c) => c.status === 'recovered');
    }
    if (selectedPulseStage === 'diagnosed') {
      return allCases.filter((c) => Boolean(c.failure_category));
    }
    if (selectedPulseStage === 'actioned') {
      return allCases.filter((c) =>
        recentActions.some((a) => a.case_id === c.case_id)
      );
    }
    if (selectedPulseStage === 'policy_approved') {
      return allCases.filter((c) =>
        recentActions.some(
          (a) => a.case_id === c.case_id && a.policy_status === 'approved'
        )
      );
    }

    return allCases;
  }, [allCases, selectedPulseStage, recentActions]);

  // Transform breakdown map into category chart array
  const categoryData = useMemo(() => {
    if (allCases.length > 0) {
      const counts: Record<string, number> = {};
      for (const c of allCases) {
        if (c.failure_category) {
          counts[c.failure_category] = (counts[c.failure_category] || 0) + 1;
        }
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

  // Transform daily metrics breakdown for trend chart (zero fake fallback)
  const trendData = useMemo(() => {
    const daily = metrics?.dailyBreakdown;
    if (daily && daily.length > 0) {
      return daily.map((d) => ({
        date: d.date.slice(5),
        Recovered: d.recoveredPaise / 100,
        AtRisk: d.riskPaise / 100,
      }));
    }
    return [];
  }, [metrics]);

  const CATEGORY_COLORS = ['#B89A62', '#6F9B7A', '#71879A', '#B68B4F', '#B56F68', '#817A70'];

  // Loading State
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="h-24 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-36 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-36 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-36 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
          <div className="h-36 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        </div>
        <div className="h-32 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] animate-pulse" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <ErrorState
        title="Dashboard Telemetry Unavailable"
        message={error}
        onRetry={() => fetchAllData(false)}
      />
    );
  }

  const atRiskPaise = Number(summary?.totalRevenueAtRiskPaise || 0);
  const recoveredPaise = Number(summary?.totalRecoveredPaise || 0);
  const recoveryRate = Number(summary?.recoveryRatePercent || 0);
  const openCases = Number(summary?.totalOpenCases || 0);
  const inProgressCases = Number(summary?.activeAutomationsCount || 0);
  const recoveredCases = Number(summary?.totalRecoveredCases || 0);
  const totalCases = allCases.length || openCases + recoveredCases;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 1. Dashboard Header: Personalized Welcome, Status, Date/Time, Admin Banner */}
      <DashboardHeader
        activeCasesCount={openCases + inProgressCases}
        totalAtRiskPaise={atRiskPaise}
        onRefresh={() => fetchAllData(true)}
        onAddCase={() => setShowAddModal(true)}
        refreshing={refreshing}
      />

      {/* 2. Primary Financial Overview: 4 Real Metrics with zero fake fallbacks */}
      <FinancialOverview
        totalRevenueAtRiskPaise={atRiskPaise}
        totalRecoveredPaise={recoveredPaise}
        recoveryRatePercent={recoveryRate}
        openCasesCount={openCases}
        inProgressCasesCount={inProgressCases}
        recoveredCasesCount={recoveredCases}
        totalCasesCount={totalCases}
      />

      {/* 3. Recovery Pulse: Visual lifecycle progression (8 actual case stages) */}
      <RecoveryPulse
        cases={allCases}
        actions={recentActions}
        selectedStage={selectedPulseStage}
        onSelectStage={setSelectedPulseStage}
      />

      {/* 4. Core Operational Interventions & Strategic AI Recommendations */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Section 4: Attention Required */}
        <AttentionRequired
          cases={displayedCases}
          actions={recentActions}
          onRetryCase={handleQuickRetry}
        />

        {/* Section 5: AI Strategic Recommendations */}
        <AiRecommendations
          actions={recentActions}
          cases={allCases}
        />
      </div>

      {/* 5. Telemetry & Analytics Visualizations */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* 14-Day Performance Trend Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Recovery Performance Trend</CardTitle>
              <CardDescription>
                Chronological comparison of recovered revenue vs new exposure (Past 14 Days)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-[#D1B982]">
                <span className="w-2 h-2 rounded-full bg-[#B89A62]" /> Recovered
              </div>
              <div className="flex items-center gap-1.5 text-[#B56F68]">
                <span className="w-2 h-2 rounded-full bg-[#B56F68]" /> At Risk
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            {trendData.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[rgba(242,237,227,0.08)] rounded-lg">
                <p className="text-xs text-[#817A70] font-mono">
                  No time-series metrics recorded for this period yet.
                </p>
                <p className="text-[11px] text-[#817A70]/80 mt-1">
                  Daily trends will appear as gateway recovery transactions accumulate.
                </p>
              </div>
            ) : (
              <div className="h-56 w-full">
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
            )}
          </CardContent>
        </Card>

        {/* Root Cause Distribution BarChart */}
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
              {categoryData.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-[rgba(242,237,227,0.08)] rounded-lg">
                  <p className="text-xs text-[#817A70] font-mono">
                    Zero failure categories detected.
                  </p>
                </div>
              ) : (
                <div className="h-44 w-full">
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
              )}
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

      {/* 6. Recent Activity & Evaluation Benchmark Launcher */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Operational Activity Feed */}
        <RecentActivityFeed
          auditLogs={auditLogs}
          actions={recentActions}
        />

        {/* Evaluation & Simulation Benchmark Suite Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Autonomous Policy & Benchmark Suite</CardTitle>
              <CardDescription>
                Test end-to-end recovery scenarios with deterministic safety guardrails
              </CardDescription>
            </div>
            <Link
              href="/evaluation"
              className="text-xs text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 font-mono transition-colors"
            >
              Benchmark Suite <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="p-4 rounded-lg bg-[#151513] border border-[rgba(242,237,227,0.08)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F2EDE3] flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-[#B89A62]" />
                  Multi-Scenario Recovery Simulator
                </span>
                <span className="text-[10px] font-mono text-[#6F9B7A] bg-[#6F9B7A]/10 px-2 py-0.5 rounded border border-[#6F9B7A]/20">
                  4 Active Flows
                </span>
              </div>
              <p className="text-xs text-[#B7B0A3] leading-relaxed">
                Execute automated UPI WhatsApp payment links, 24h bank cycle cooldown retries, and strict subscription policy guardrails in real-time.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/evaluation"
                className="bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] font-semibold text-xs px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-all font-mono"
              >
                <Play className="w-3.5 h-3.5 fill-[#151513]" />
                Launch Live Demo Scenarios
                <span className="ml-1 text-[10px] bg-[#151513]/15 px-1.5 py-0.5 rounded">
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
            fetchAllData(true);
          }}
        />
      )}
    </div>
  );
}
