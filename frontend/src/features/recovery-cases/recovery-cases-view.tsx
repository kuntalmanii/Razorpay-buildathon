'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase, AuditLog, PaginationMeta } from '@/types/api';
import { formatINR, formatDate, getStatusBadge } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  User,
  CreditCard,
  CheckCircle,
} from 'lucide-react';

export function RecoveryCasesView() {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  // Selected case drawer
  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [caseAudit, setCaseAudit] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

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

  // Load audit trail when a case is selected
  const handleSelectCase = async (c: RecoveryCase) => {
    setSelectedCase(c);
    setAuditLoading(true);
    try {
      const logs = await apiClient.getCaseAudit(c.case_id);
      setCaseAudit(logs);
    } catch {
      setCaseAudit([]);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#13161C] border border-[#232733]">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by case status"
              className="bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by failure category"
              className="bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Categories</option>
              <option value="insufficient_funds">Insufficient Funds</option>
              <option value="bank_decline">Bank Decline</option>
              <option value="network_failure">Network Failure</option>
              <option value="card_expired">Card Expired</option>
              <option value="subscription_halted">Subscription Halted</option>
              <option value="customer_abandoned">Customer Abandoned</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-stone-400 font-mono">
          Showing {cases.length} of {meta.total} cases
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Risk Cases</CardTitle>
          <CardDescription>
            Deterministic risk cases monitored and intervened by RecoverIQ
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <ErrorState title="Error fetching recovery cases" message={error} onRetry={fetchCases} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                  <TableRowSkeleton columns={6} />
                </tbody>
              </table>
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              title="No Recovery Cases Found"
              description={
                statusFilter || categoryFilter
                  ? 'No cases match your active filters. Try clearing your filters.'
                  : 'No payment failures have been recorded yet.'
              }
              actionLabel={statusFilter || categoryFilter ? 'Clear Filters' : undefined}
              onAction={() => {
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
                    <th className="py-3.5 px-4 font-medium">Case ID</th>
                    <th className="py-3.5 px-4 font-medium">Amount at Risk</th>
                    <th className="py-3.5 px-4 font-medium">Failure Category</th>
                    <th className="py-3.5 px-4 font-medium">Risk Score</th>
                    <th className="py-3.5 px-4 font-medium">Recovery Prob.</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-4 font-medium">Detected</th>
                    <th className="py-3.5 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E232E]">
                  {cases.map((c) => {
                    const badge = getStatusBadge(c.status);
                    return (
                      <tr
                        key={c.case_id}
                        className="hover:bg-[#181C24]/60 transition-colors cursor-pointer"
                        onClick={() => handleSelectCase(c)}
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-amber-400">
                          {c.case_id.slice(0, 18)}...
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-stone-100">
                          {formatINR(c.amount_at_risk)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-stone-300">
                          {c.failure_category}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-stone-200">{c.risk_score}</span>
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
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-400">
                          {(c.recovery_probability * 100).toFixed(0)}%
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-400">{formatDate(c.detected_at)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCase(c);
                            }}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {meta.totalPages > 1 && (
            <div className="p-4 border-t border-[#1E232E] flex items-center justify-between">
              <div className="text-xs text-stone-400">
                Page {meta.page} of {meta.totalPages}
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

      {/* Case Details Drawer */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#111319] border-l border-[#232733] h-full overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-[#1E232E] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-stone-100">Case Details</h3>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      getStatusBadge(selectedCase.status).className
                    }`}
                  >
                    {getStatusBadge(selectedCase.status).label}
                  </span>
                </div>
                <p className="text-xs font-mono text-amber-400 mt-1">{selectedCase.case_id}</p>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-[#1A1E26]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial & Diagnostic Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#161922] border border-[#232733]">
                <span className="text-[11px] text-stone-400 uppercase tracking-wider">
                  Amount at Risk
                </span>
                <div className="text-xl font-bold font-mono text-stone-100 mt-1">
                  {formatINR(selectedCase.amount_at_risk)}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#161922] border border-[#232733]">
                <span className="text-[11px] text-stone-400 uppercase tracking-wider">
                  Recovered Amount
                </span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {formatINR(selectedCase.recovered_amount || 0)}
                </div>
              </div>
            </div>

            {/* Diagnostic Metrics */}
            <div className="p-4 rounded-xl bg-[#161922] border border-[#232733] space-y-3">
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                Risk Engine Diagnostics
              </h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-stone-400">Failure Category:</span>
                  <div className="font-mono text-stone-200 mt-0.5">
                    {selectedCase.failure_category}
                  </div>
                </div>
                <div>
                  <span className="text-stone-400">Risk Score:</span>
                  <div className="font-mono text-amber-400 font-semibold mt-0.5">
                    {selectedCase.risk_score} / 100
                  </div>
                </div>
                <div>
                  <span className="text-stone-400">Recovery Probability:</span>
                  <div className="font-mono text-emerald-400 font-semibold mt-0.5">
                    {(selectedCase.recovery_probability * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <span className="text-stone-400">Detected At:</span>
                  <div className="text-stone-200 mt-0.5">{formatDate(selectedCase.detected_at)}</div>
                </div>
              </div>
            </div>

            {/* Customer & Gateway References */}
            <div className="p-4 rounded-xl bg-[#161922] border border-[#232733] space-y-3">
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">
                Gateway & Customer Context
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Customer ID:
                  </span>
                  <span className="font-mono text-stone-200">
                    {selectedCase.customer_id || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Payment ID:
                  </span>
                  <span className="font-mono text-stone-200">
                    {selectedCase.payment_id || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Audit Trail Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" /> Immutable Audit Trail
              </h4>
              {auditLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-[#161922] animate-pulse rounded-lg" />
                  <div className="h-10 bg-[#161922] animate-pulse rounded-lg" />
                </div>
              ) : caseAudit.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No audit records found for this case.</p>
              ) : (
                <div className="space-y-2.5">
                  {caseAudit.map((log) => (
                    <div
                      key={log.log_id}
                      className="p-3 rounded-lg bg-[#161922] border border-[#232733] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-200 font-mono">{log.action}</span>
                        <span className="text-[10px] text-stone-400">{formatDate(log.created_at)}</span>
                      </div>
                      <div className="text-stone-400 flex items-center gap-2 text-[11px]">
                        <span>Actor: {log.actor_type}</span>
                        <span>•</span>
                        <span>Entity: {log.entity_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
