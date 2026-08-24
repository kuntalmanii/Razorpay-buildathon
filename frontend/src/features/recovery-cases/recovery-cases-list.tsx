'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase, PaginationMeta } from '@/types/api';
import { formatINR, formatDate, getStatusBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  Bot,
  Filter,
  RefreshCw,
} from 'lucide-react';

/**
 * Deterministically deduce suggested action for display in the table
 */
function getRecommendedActionBadge(category: string, riskScore: number) {
  const cat = category.toLowerCase();
  if (cat.includes('insufficient')) {
    return { label: 'PAYMENT LINK', variant: 'gold' as const };
  }
  if (cat.includes('network') || cat.includes('decline')) {
    return riskScore > 60
      ? { label: 'PAYMENT LINK', variant: 'gold' as const }
      : { label: 'SCHEDULE RETRY', variant: 'blue' as const };
  }
  if (cat.includes('subscription') || cat.includes('mandate')) {
    return { label: 'PAYMENT LINK', variant: 'gold' as const };
  }
  if (riskScore >= 75) {
    return { label: 'ESCALATE', variant: 'purple' as const };
  }
  return { label: 'WAIT & RETRY', variant: 'neutral' as const };
}

export function RecoveryCasesList() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<'detected_at' | 'amount_at_risk' | 'risk_score' | 'recovery_probability'>('detected_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getRecoveryCases({
        page,
        limit: 10,
        status: statusFilter || undefined,
        failureCategory: categoryFilter || undefined,
      });
      setCases(res.cases);
      setMeta(res.meta);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Client-side search and sort on the active page
  const processedCases = useMemo(() => {
    let result = [...cases];

    // Filter by search term
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.customer_name?.toLowerCase().includes(q) ||
          c.customer_email?.toLowerCase().includes(q) ||
          c.customer_id?.toLowerCase().includes(q) ||
          c.payment_id?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortField === 'amount_at_risk') {
        valA = Number(a.amount_at_risk);
        valB = Number(b.amount_at_risk);
      } else if (sortField === 'risk_score') {
        valA = Number(a.risk_score);
        valB = Number(b.risk_score);
      } else if (sortField === 'recovery_probability') {
        valA = Number(a.recovery_probability);
        valB = Number(b.recovery_probability);
      } else {
        valA = new Date(a.detected_at).getTime();
        valB = new Date(b.detected_at).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [cases, searchQuery, sortField, sortOrder]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#13161C] border border-[#232733] flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by Case ID, Customer, Payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-400"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by case status"
              className="bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="recovered">Recovered</option>
              <option value="escalated">Escalated</option>
              <option value="unrecoverable">Unrecoverable</option>
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by failure category"
            className="bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="">All Failure Categories</option>
            <option value="insufficient_funds">Insufficient Funds</option>
            <option value="bank_decline">Bank Decline</option>
            <option value="network_failure">Network Failure</option>
            <option value="card_expired">Card Expired</option>
            <option value="subscription_halted">Subscription Halted</option>
            <option value="customer_abandoned">Customer Abandoned</option>
          </select>

          <Button variant="ghost" size="sm" onClick={fetchCases} aria-label="Refresh list">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Cases Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue Risk Cases</CardTitle>
            <CardDescription>
              Telemetry feed of diagnosed payment failures, risk probabilities, and recovery recommendations
            </CardDescription>
          </div>
          <div className="text-xs text-stone-400 font-mono">
            Showing {processedCases.length} of {meta.total} cases
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <ErrorState title="Failed to load recovery cases" message={error} onRetry={fetchCases} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                  <TableRowSkeleton columns={9} />
                </tbody>
              </table>
            </div>
          ) : processedCases.length === 0 ? (
            <EmptyState
              title="No Recovery Cases Found"
              description={
                searchQuery || statusFilter || categoryFilter
                  ? 'No recovery cases match your active filters or search query.'
                  : 'No payment failures have been recorded yet in Test Mode.'
              }
              actionLabel={
                searchQuery || statusFilter || categoryFilter ? 'Clear All Filters' : undefined
              }
              onAction={() => {
                setSearchQuery('');
                setStatusFilter('');
                setCategoryFilter('');
                setPage(1);
              }}
              className="m-6 py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Case ID</th>
                    <th className="py-3 px-4 font-medium">Customer</th>
                    <th
                      className="py-3 px-4 font-medium cursor-pointer hover:text-stone-200 select-none"
                      onClick={() => toggleSort('amount_at_risk')}
                    >
                      <div className="flex items-center gap-1">
                        Amount at Risk <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 font-medium">Failure Category</th>
                    <th
                      className="py-3 px-4 font-medium cursor-pointer hover:text-stone-200 select-none"
                      onClick={() => toggleSort('risk_score')}
                    >
                      <div className="flex items-center gap-1">
                        Risk Score <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-medium cursor-pointer hover:text-stone-200 select-none"
                      onClick={() => toggleSort('recovery_probability')}
                    >
                      <div className="flex items-center gap-1">
                        Recovery Prob. <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Recommended Action</th>
                    <th
                      className="py-3 px-4 font-medium cursor-pointer hover:text-stone-200 select-none"
                      onClick={() => toggleSort('detected_at')}
                    >
                      <div className="flex items-center gap-1">
                        Detected <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-4 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E232E]">
                  {processedCases.map((c) => {
                    const badge = getStatusBadge(c.status);
                    const riskNum = Number(c.risk_score);
                    const probNum = Number(c.recovery_probability);
                    const amountNum = Number(c.amount_at_risk);
                    const recommended = getRecommendedActionBadge(c.failure_category, riskNum);

                    return (
                      <tr
                        key={c.case_id}
                        className="hover:bg-[#181C24]/60 transition-colors group"
                      >
                        {/* Case ID */}
                        <td className="py-3.5 px-4 font-mono font-medium">
                          <Link
                            href={`/recovery-cases/${c.case_id}`}
                            className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                          >
                            {c.case_id.slice(0, 16)}...
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-stone-200">
                            {c.customer_name || 'Guest / Merchant Order'}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {c.customer_email || c.customer_id?.slice(0, 14) || '—'}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-stone-100">
                          {formatINR(amountNum)}
                        </td>

                        {/* Failure Category */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] text-stone-300">
                            {c.failure_category}
                          </span>
                        </td>

                        {/* Risk Score */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-stone-200 font-medium">
                              {riskNum}
                            </span>
                            <div className="w-12 bg-[#1F242E] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  riskNum > 70
                                    ? 'bg-rose-400'
                                    : riskNum > 40
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, riskNum)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Recovery Probability */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                          {(probNum * 100).toFixed(0)}%
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Recommended Action */}
                        <td className="py-3.5 px-4">
                          <Badge variant={recommended.variant} className="text-[10px] py-0.5 font-mono">
                            <Bot className="w-2.5 h-2.5 mr-1" />
                            {recommended.label}
                          </Badge>
                        </td>

                        {/* Detected Time */}
                        <td className="py-3.5 px-4 text-stone-400">
                          {formatDate(c.detected_at)}
                        </td>

                        {/* Inspect Link */}
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/recovery-cases/${c.case_id}`}>
                            <Button variant="outline" size="sm" className="text-xs">
                              Inspect
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="p-4 border-t border-[#1E232E] flex items-center justify-between">
              <div className="text-xs text-stone-400">
                Page {meta.page} of {meta.totalPages} ({meta.total} total cases)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
