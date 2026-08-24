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
import { AddCaseModal } from './add-case-modal';
import { EditCaseDrawer } from './edit-case-drawer';
import {
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
  History,
  User,
  CreditCard,
  CheckCircle2,
  Plus,
  Pencil,
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

  // Add / Edit modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCase, setEditingCase] = useState<RecoveryCase | null>(null);

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
      setCases(res.cases || []);
      setMeta(res.meta || { page: 1, limit: 10, total: 0, totalPages: 0 });
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
      setCaseAudit(logs.logs || logs);
    } catch {
      setCaseAudit([]);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#B89A62]" />
          <span className="text-xs font-semibold text-[#F2EDE3]">
            Filter Monitored Failure Cases
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by case status"
            className="bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#B89A62]/50 font-mono"
          >
            <option value="">All Case Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="recovered">Recovered</option>
            <option value="escalated">Escalated</option>
            <option value="unrecoverable">Unrecoverable</option>
          </select>

          {/* Failure Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by failure category"
            className="bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#B89A62]/50 font-mono"
          >
            <option value="">All Failure Categories</option>
            <option value="insufficient_funds">Insufficient Funds</option>
            <option value="bank_decline">Bank Decline</option>
            <option value="network_failure">Network Failure</option>
            <option value="card_expired">Card Expired</option>
            <option value="subscription_halted">Subscription Halted</option>
            <option value="customer_abandoned">Customer Abandoned</option>
          </select>
          {/* Add Case Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Case
          </Button>
        </div>
      </div>

      {/* Main Cases Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Monitored Revenue Risk Cases</CardTitle>
            <CardDescription>
              Autonomous case tracking with deterministic failure scoring
            </CardDescription>
          </div>
          <div className="text-xs text-[#817A70] font-mono">
            Total: {meta.total} cases
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
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                </tbody>
              </table>
            </div>
          ) : cases.length === 0 ? (
            <EmptyState
              title="No Recovery Cases Found"
              description={
                statusFilter || categoryFilter
                  ? 'No recovery cases match your active filter criteria.'
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
                <thead className="bg-[#181714] text-[#817A70] border-b border-[rgba(242,237,227,0.08)] font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Case ID</th>
                    <th className="py-2.5 px-4 font-medium">Customer</th>
                    <th className="py-2.5 px-4 font-medium">Amount At Risk</th>
                    <th className="py-2.5 px-4 font-medium">Category</th>
                    <th className="py-2.5 px-4 font-medium">Risk Score</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Detected</th>
                    <th className="py-2.5 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(242,237,227,0.06)]">
                  {cases.map((c) => {
                    const badge = getStatusBadge(c.status);
                    const isSelected = selectedCase?.case_id === c.case_id;

                    return (
                      <tr
                        key={c.case_id}
                        onClick={() => handleSelectCase(c)}
                        className={`cursor-pointer transition-colors duration-150 ${
                          isSelected ? 'bg-[#24221E]' : 'hover:bg-[#24221E]/60'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-medium text-[#D1B982]">
                          {c.case_id.slice(0, 16)}...
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#F2EDE3]">
                            {c.customer_name || 'Guest Customer'}
                          </div>
                          <div className="text-[10px] text-[#817A70] font-mono">
                            {c.customer_email || c.customer_id || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-[#F2EDE3]">
                          {formatINR(Number(c.amount_at_risk))}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#B7B0A3]">
                          {c.failure_category}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-xs text-[#F2EDE3]">{c.risk_score}</span>
                            <div className="w-10 bg-[#24221E] h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  c.risk_score > 70
                                    ? 'bg-[#B56F68]'
                                    : c.risk_score > 40
                                    ? 'bg-[#B68B4F]'
                                    : 'bg-[#6F9B7A]'
                                }`}
                                style={{ width: `${Math.min(100, c.risk_score)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-mono font-medium border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#817A70] font-mono text-[11px]">
                          {formatDate(c.detected_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
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
                            <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 h-7">
                              Inspect
                            </Button>
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
          {meta.totalPages > 1 && (
            <div className="p-3.5 border-t border-[rgba(242,237,227,0.08)] flex items-center justify-between text-xs text-[#817A70] font-mono">
              <div>
                Page {meta.page} of {meta.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-7 text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Case Slide-in Drawer */}
      {selectedCase && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#151513] border-l border-[rgba(242,237,227,0.12)] shadow-2xl z-40 flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right duration-200">
          <div className="p-4 sm:p-5 border-b border-[rgba(242,237,227,0.08)] flex items-center justify-between bg-[#1C1B18]">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#817A70]">
                Case Details
              </span>
              <h3 className="text-sm font-semibold font-mono text-[#F2EDE3]">
                #{selectedCase.case_id}
              </h3>
            </div>
            <button
              onClick={() => setSelectedCase(null)}
              className="text-[#817A70] hover:text-[#F2EDE3] p-1.5 rounded-md hover:bg-[#24221E] transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <span className="text-[#817A70] block text-[10px] font-mono">Amount At Risk:</span>
                <span className="font-mono font-bold text-[#F2EDE3] text-sm mt-0.5 block">
                  {formatINR(Number(selectedCase.amount_at_risk))}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
                <span className="text-[#817A70] block text-[10px] font-mono">Recovery Prob:</span>
                <span className="font-mono font-bold text-[#6F9B7A] text-sm mt-0.5 block">
                  {(Number(selectedCase.recovery_probability) * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Customer Information */}
            <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-2 text-xs">
              <div className="flex items-center gap-2 font-medium text-[#F2EDE3] border-b border-[rgba(242,237,227,0.06)] pb-2">
                <User className="w-3.5 h-3.5 text-[#B89A62]" /> Customer Profile
              </div>
              <div className="space-y-1 text-[#817A70] text-[11px] font-mono">
                <div>Name: <span className="text-[#F2EDE3]">{selectedCase.customer_name || 'Guest'}</span></div>
                <div>Email: <span className="text-[#F2EDE3]">{selectedCase.customer_email || '—'}</span></div>
                <div>Customer ID: <span className="text-[#F2EDE3]">{selectedCase.customer_id || '—'}</span></div>
                <div>Merchant ID: <span className="text-[#F2EDE3]">{selectedCase.merchant_id}</span></div>
              </div>
            </div>

            {/* Failure Breakdown */}
            <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] space-y-2 text-xs">
              <div className="flex items-center gap-2 font-medium text-[#F2EDE3] border-b border-[rgba(242,237,227,0.06)] pb-2">
                <CreditCard className="w-3.5 h-3.5 text-[#B89A62]" /> Failure Diagnostics
              </div>
              <div className="space-y-1 text-[#817A70] text-[11px] font-mono">
                <div>Category: <span className="text-[#D1B982]">{selectedCase.failure_category}</span></div>
                <div>Payment Ref: <span className="text-[#F2EDE3]">{selectedCase.payment_id || '—'}</span></div>
                <div>Subscription: <span className="text-[#F2EDE3]">{selectedCase.subscription_id || 'One-time Payment'}</span></div>
                <div>Risk Score: <span className="text-[#F2EDE3]">{selectedCase.risk_score} / 100</span></div>
              </div>
            </div>

            {/* Case Audit Trail */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 font-medium text-[#F2EDE3]">
                <History className="w-3.5 h-3.5 text-[#B89A62]" /> Case Audit Trail
              </div>
              {auditLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-[#1C1B18] rounded animate-pulse" />
                  <div className="h-10 bg-[#1C1B18] rounded animate-pulse" />
                </div>
              ) : caseAudit.length === 0 ? (
                <p className="text-xs text-[#817A70] italic">No audit records for this case.</p>
              ) : (
                <div className="space-y-2">
                  {caseAudit.map((log) => (
                    <div
                      key={log.log_id}
                      className="p-2.5 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] space-y-1 text-[11px] font-mono"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#F2EDE3]">{log.action}</span>
                        <span className="text-[10px] text-[#817A70]">{formatDate(log.created_at)}</span>
                      </div>
                      <p className="text-[#817A70]">Actor: {log.actor_type}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Case Modal */}
      {showAddModal && (
        <AddCaseModal
          onClose={() => setShowAddModal(false)}
          onCreated={(newCase) => {
            setShowAddModal(false);
            setCases((prev) => [newCase, ...prev]);
            setMeta((prev) => ({ ...prev, total: prev.total + 1 }));
          }}
        />
      )}

      {/* Edit Case Drawer */}
      {editingCase && (
        <EditCaseDrawer
          caseData={editingCase}
          onClose={() => setEditingCase(null)}
          onUpdated={(updated) => {
            setCases((prev) => prev.map((c) => (c.case_id === updated.case_id ? updated : c)));
            if (selectedCase?.case_id === updated.case_id) setSelectedCase(updated);
            setEditingCase(null);
          }}
        />
      )}
    </div>
  );
}
