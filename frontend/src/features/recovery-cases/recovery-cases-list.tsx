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
  ExternalLink,
  Bot,
  Filter,
  RefreshCw,
  Plus,
  Pencil,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { AddCaseModal } from './add-case-modal';
import { EditCaseDrawer } from './edit-case-drawer';

type TabFilter = 'all' | 'active' | 'needs_approval' | 'recovered' | 'blocked' | 'failed';

/**
 * Returns the AI recommendation status and strategy based on real case attributes
 */
function getCaseAiStrategy(c: RecoveryCase) {
  const riskNum = Number(c.risk_score || 0);
  const cat = (c.failure_category || '').toLowerCase();

  // Strategy
  let strategy = 'SMART RETRY';
  if (cat.includes('insufficient') || cat.includes('card_expired') || cat.includes('mandate')) {
    strategy = 'PAYMENT LINK';
  } else if (riskNum >= 75) {
    strategy = 'MANUAL ESCALATION';
  } else if (cat.includes('network') || cat.includes('decline')) {
    strategy = riskNum > 60 ? 'PAYMENT LINK' : '24H COOLDOWN RETRY';
  }

  // AI Recommendation Status
  if (c.status === 'recovered') {
    return {
      statusLabel: 'SETTLED',
      statusVariant: 'emerald' as const,
      strategy,
    };
  }

  if (c.status === 'escalated') {
    return {
      statusLabel: 'POLICY BLOCKED',
      statusVariant: 'rose' as const,
      strategy: 'SAFETY HALT',
    };
  }

  if (c.status === 'unrecoverable') {
    return {
      statusLabel: 'EXHAUSTED',
      statusVariant: 'neutral' as const,
      strategy: 'NO SAFE ACTION',
    };
  }

  if (riskNum >= 70 && c.status === 'open') {
    return {
      statusLabel: 'NEEDS APPROVAL',
      statusVariant: 'gold' as const,
      strategy,
    };
  }

  return {
    statusLabel: 'POLICY APPROVED',
    statusVariant: 'blue' as const,
    strategy,
  };
}

export function RecoveryCasesList() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<'detected_at' | 'amount_at_risk' | 'risk_score' | 'recovery_probability'>('detected_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Add / Edit modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCase, setEditingCase] = useState<RecoveryCase | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getRecoveryCases({
        page: 1,
        limit: 100, // fetch full active pool to power real counts and instant filtering
      });
      setCases(res.cases || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  // Compute live counts for each tab from real backend data
  const tabCounts = useMemo(() => {
    return {
      all: cases.length,
      active: cases.filter((c) => c.status === 'open' || c.status === 'in_progress').length,
      needs_approval: cases.filter((c) => c.status === 'open' && Number(c.risk_score || 0) >= 70).length,
      recovered: cases.filter((c) => c.status === 'recovered').length,
      blocked: cases.filter((c) => c.status === 'escalated').length,
      failed: cases.filter((c) => c.status === 'unrecoverable').length,
    };
  }, [cases]);

  // Apply tab filter, search, category filter, and sorting
  const processedCases = useMemo(() => {
    let result = [...cases];

    // 1. Tab Filter
    if (activeTab === 'active') {
      result = result.filter((c) => c.status === 'open' || c.status === 'in_progress');
    } else if (activeTab === 'needs_approval') {
      result = result.filter((c) => c.status === 'open' && Number(c.risk_score || 0) >= 70);
    } else if (activeTab === 'recovered') {
      result = result.filter((c) => c.status === 'recovered');
    } else if (activeTab === 'blocked') {
      result = result.filter((c) => c.status === 'escalated');
    } else if (activeTab === 'failed') {
      result = result.filter((c) => c.status === 'unrecoverable');
    }

    // 2. Category Filter
    if (categoryFilter) {
      result = result.filter((c) => c.failure_category === categoryFilter);
    }

    // 3. Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.case_id.toLowerCase().includes(q) ||
          c.customer_name?.toLowerCase().includes(q) ||
          c.customer_email?.toLowerCase().includes(q) ||
          c.payment_id?.toLowerCase().includes(q) ||
          c.failure_category.toLowerCase().includes(q)
      );
    }

    // 4. Sort
    result.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;

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

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [cases, activeTab, categoryFilter, searchQuery, sortField, sortOrder]);

  // Paginated slice
  const paginatedCases = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedCases.slice(start, start + pageSize);
  }, [processedCases, page]);

  const totalPages = Math.ceil(processedCases.length / pageSize) || 1;

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* 1. Filter Tabs backed by real backend data */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)]">
        {[
          { id: 'all' as TabFilter, label: 'All Cases', count: tabCounts.all },
          { id: 'active' as TabFilter, label: 'Active', count: tabCounts.active },
          { id: 'needs_approval' as TabFilter, label: 'Needs Approval', count: tabCounts.needs_approval, alert: tabCounts.needs_approval > 0 },
          { id: 'recovered' as TabFilter, label: 'Recovered', count: tabCounts.recovered },
          { id: 'blocked' as TabFilter, label: 'Blocked', count: tabCounts.blocked },
          { id: 'failed' as TabFilter, label: 'Failed', count: tabCounts.failed },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                isActive
                  ? 'bg-[#B89A62] text-[#151513] font-bold shadow-sm'
                  : 'text-[#B7B0A3] hover:text-[#F2EDE3] hover:bg-[#24221E]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] ${
                  isActive
                    ? 'bg-[#151513]/20 text-[#151513]'
                    : tab.alert
                    ? 'bg-[#B56F68]/20 text-[#B56F68] border border-[#B56F68]/30 font-bold'
                    : 'bg-[#24221E] text-[#817A70]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Search & Category Toolbar */}
      <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#817A70] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Case ID, Customer, Payment ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md pl-9 pr-8 py-1.5 focus:outline-none focus:border-[#B89A62]/50 transition-colors placeholder:text-[#817A70] font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#817A70] hover:text-[#F2EDE3] p-0.5 rounded transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#817A70]" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by problem category"
              className="bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#B89A62]/50 font-mono"
            >
              <option value="">All Problem Types</option>
              <option value="bank_decline">Bank Decline</option>
              <option value="insufficient_funds">Insufficient Funds</option>
              <option value="network_error">Network Failure</option>
              <option value="card_expired">Card Expired</option>
              <option value="subscription_halt">Subscription Halt</option>
              <option value="authentication_failure">Authentication Failure</option>
              <option value="payment_failure">General Payment Failure</option>
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCases}
            aria-label="Refresh list"
            className="h-8 w-8 p-0 text-[#817A70] hover:text-[#F2EDE3]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#B89A62]' : ''}`} />
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-8 text-xs font-semibold flex items-center gap-1.5 bg-[#B89A62] hover:bg-[#D1B982] text-[#151513]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Case
          </Button>
        </div>
      </div>

      {/* 3. Main Cases Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Recovery Cases Workspace</CardTitle>
            <CardDescription>
              Telemetry feed of diagnosed payment failures, AI recommendations, and recovery lifecycles
            </CardDescription>
          </div>
          <div className="text-xs text-[#817A70] font-mono">
            Showing {paginatedCases.length} of {processedCases.length} cases
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
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                  <TableRowSkeleton columns={8} />
                </tbody>
              </table>
            </div>
          ) : processedCases.length === 0 ? (
            <EmptyState
              title="No Matching Recovery Cases"
              description={
                searchQuery || categoryFilter || activeTab !== 'all'
                  ? 'No recovery cases match your active filters or search criteria.'
                  : 'Zero payment failures currently recorded in the system.'
              }
              actionLabel={
                searchQuery || categoryFilter || activeTab !== 'all' ? 'Reset Filters' : undefined
              }
              onAction={() => {
                setActiveTab('all');
                setSearchQuery('');
                setCategoryFilter('');
                setPage(1);
              }}
              className="m-6 py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[980px]">
                <thead className="bg-[#181714] text-[#817A70] border-b border-[rgba(242,237,227,0.08)] font-mono text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5 font-medium whitespace-nowrap">Case ID</th>
                    <th
                      className="py-3 px-3.5 font-medium cursor-pointer hover:text-[#F2EDE3] select-none transition-colors whitespace-nowrap"
                      onClick={() => toggleSort('amount_at_risk')}
                    >
                      <div className="flex items-center gap-1">
                        Amount at Risk <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3.5 font-medium whitespace-nowrap">Problem Type</th>
                    <th className="py-3 px-3.5 font-medium whitespace-nowrap">Status</th>
                    <th className="py-3 px-3.5 font-medium whitespace-nowrap">AI Recommendation</th>
                    <th className="py-3 px-3.5 font-medium whitespace-nowrap">Recovery Strategy</th>
                    <th
                      className="py-3 px-3.5 font-medium cursor-pointer hover:text-[#F2EDE3] select-none transition-colors whitespace-nowrap"
                      onClick={() => toggleSort('detected_at')}
                    >
                      <div className="flex items-center gap-1">
                        Last Updated <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="py-3 px-3.5 font-medium text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,237,227,0.06)]">
                  {paginatedCases.map((c) => {
                    const badge = getStatusBadge(c.status);
                    const amountNum = Number(c.amount_at_risk);
                    const aiInfo = getCaseAiStrategy(c);

                    return (
                      <tr
                        key={c.case_id}
                        className="hover:bg-[#24221E]/60 transition-colors duration-150 group"
                      >
                        {/* 1. Case ID */}
                        <td className="py-3 px-3.5 font-mono font-medium whitespace-nowrap">
                          <Link
                            href={`/recovery-cases/${c.case_id}`}
                            className="text-[#D1B982] hover:text-[#F2EDE3] hover:underline flex items-center gap-1 transition-colors"
                          >
                            #{c.case_id.slice(-8).toUpperCase()}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <div className="text-[10px] text-[#817A70] font-mono mt-0.5">
                            {c.customer_name || 'Guest Order'}
                          </div>
                        </td>

                        {/* 2. Amount at Risk */}
                        <td className="py-3 px-3.5 font-mono font-bold text-[#F2EDE3] whitespace-nowrap">
                          {formatINR(amountNum)}
                        </td>

                        {/* 3. Problem Type */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-[#B7B0A3] bg-[#24221E] px-2 py-0.5 rounded border border-[rgba(242,237,227,0.06)] capitalize">
                            {c.failure_category.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* 4. Current Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* 5. AI Recommendation Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <Badge variant={aiInfo.statusVariant} className="text-[10px] py-0.5 font-mono">
                            <Bot className="w-2.5 h-2.5 mr-1" />
                            {aiInfo.statusLabel}
                          </Badge>
                        </td>

                        {/* 6. Recovery Strategy */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-[#D1B982] flex items-center gap-1 font-medium">
                            <Zap className="w-3 h-3 text-[#B89A62]" />
                            {aiInfo.strategy}
                          </span>
                        </td>

                        {/* 7. Last Updated */}
                        <td className="py-3 px-3.5 text-[#817A70] font-mono text-[11px] whitespace-nowrap">
                          {formatDate(c.detected_at)}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCase(c);
                              }}
                              className="text-xs py-1 px-2 h-7 text-[#817A70] hover:text-[#B89A62]"
                              title="Edit case"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Link href={`/recovery-cases/${c.case_id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs py-1 px-3 h-7 border-[rgba(242,237,227,0.12)] hover:border-[#B89A62] text-[#B7B0A3] hover:text-[#F2EDE3]"
                              >
                                Inspect
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3.5 border-t border-[rgba(242,237,227,0.08)] flex items-center justify-between text-xs text-[#817A70] font-mono">
              <div>
                Page {page} of {totalPages} ({processedCases.length} filtered cases)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 px-2 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 px-2 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Case Modal */}
      {showAddModal && (
        <AddCaseModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            fetchCases();
          }}
        />
      )}

      {/* Edit Case Drawer */}
      {editingCase && (
        <EditCaseDrawer
          caseData={editingCase}
          onClose={() => setEditingCase(null)}
          onUpdated={() => {
            setEditingCase(null);
            fetchCases();
          }}
        />
      )}
    </div>
  );
}
