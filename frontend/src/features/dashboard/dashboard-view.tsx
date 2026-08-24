'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { DashboardSummary } from '@/types/api';
import { formatINR, formatDate, getStatusBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getDashboardSummary();
      setData(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-xl bg-[#13161C] border border-[#232733] animate-pulse" />
          <div className="h-72 rounded-xl bg-[#13161C] border border-[#232733] animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Could not load dashboard statistics"
        message={error}
        onRetry={fetchSummary}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No Dashboard Data Available"
        description="No revenue risk cases or recovery events have been recorded yet."
        actionLabel="Refresh Metrics"
        onAction={fetchSummary}
      />
    );
  }

  // Transform breakdown map into chart array
  const categoryData = Object.entries(data.breakdownByFailureCategory || {}).map(
    ([name, value]) => ({
      name: name.replace(/_/g, ' ').toUpperCase(),
      count: value,
    })
  );

  const CHART_COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recovered */}
        <Card glow className="border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-amber-400">
                Total Recovered
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-stone-100 mt-2 font-mono">
              {formatINR(data.totalRecoveredPaise)}
            </div>
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">
                {data.totalRecoveredCases} cases
              </span>{' '}
              successfully saved
            </p>
          </CardContent>
        </Card>

        {/* Revenue at Risk */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-rose-400">
                Revenue at Risk
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-stone-100 mt-2 font-mono">
              {formatINR(data.totalRevenueAtRiskPaise)}
            </div>
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
              <span className="text-rose-400 font-medium">{data.totalOpenCases}</span> open
              unresolved cases
            </p>
          </CardContent>
        </Card>

        {/* Recovery Rate */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-blue-400">
                Recovery Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-stone-100 mt-2 font-mono">
              {data.recoveryRatePercent.toFixed(1)}%
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Deterministic recovery efficiency
            </p>
          </CardContent>
        </Card>

        {/* Active Automations */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-purple-400">
                Active Cases
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-stone-100 mt-2 font-mono">
              {data.totalOpenCases + data.totalRecoveredCases}
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Monitored through Razorpay webhooks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Failure Category & Recent Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failure Category Distribution Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Failure Category Breakdown</CardTitle>
            <CardDescription>Deterministic classification of payment failures</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {categoryData.length === 0 ? (
              <EmptyState
                title="No Failures Recorded"
                description="No payment failure categories classified yet."
                className="py-8"
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" stroke="#4B5563" fontSize={11} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#9CA3AF"
                      fontSize={10}
                      width={100}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#181C24',
                        borderColor: '#282E3B',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F3F4F6',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Cases Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Revenue Risk Cases</CardTitle>
              <CardDescription>Live risk cases detected via Razorpay test webhooks</CardDescription>
            </div>
            <Link
              href="/recovery-cases"
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              View All Cases <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentCases.length === 0 ? (
              <EmptyState
                title="No Cases Detected"
                description="Simulate a Razorpay webhook to generate test recovery cases."
                className="m-5 py-8"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                    <tr>
                      <th className="py-3 px-4 font-medium">Case ID</th>
                      <th className="py-3 px-4 font-medium">Amount</th>
                      <th className="py-3 px-4 font-medium">Failure Category</th>
                      <th className="py-3 px-4 font-medium">Risk Score</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium">Detected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E232E]">
                    {data.recentCases.map((c) => {
                      const badge = getStatusBadge(c.status);
                      return (
                        <tr key={c.case_id} className="hover:bg-[#181C24]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-stone-200">
                            <Link
                              href={`/recovery-cases/${c.case_id}`}
                              className="text-amber-400 hover:underline"
                            >
                              {c.case_id.slice(0, 16)}...
                            </Link>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-stone-100">
                            {formatINR(c.amount_at_risk)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] text-stone-300">
                              {c.failure_category}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-stone-300">
                                {c.risk_score}/100
                              </span>
                              <div className="w-12 bg-[#1F242E] h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    c.risk_score > 70
                                      ? 'bg-rose-400'
                                      : c.risk_score > 40
                                      ? 'bg-amber-400'
                                      : 'bg-emerald-400'
                                  }`}
                                  style={{ width: `${c.risk_score}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-stone-400">
                            {formatDate(c.detected_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
