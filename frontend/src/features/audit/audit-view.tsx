'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { AuditLog } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

export function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAuditLogs({ page: 1, limit: 50 });
      setLogs(res.logs || res || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System & Policy Audit Trail</CardTitle>
          <CardDescription>
            Immutable chronological record of all state transitions, AI diagnoses, policy gates, and action executions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <ErrorState title="Could not load audit trail" message={error} onRetry={fetchLogs} />
            </div>
          ) : loading ? (
            <div className="p-4">
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                  <TableRowSkeleton columns={5} />
                </tbody>
              </table>
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No Audit Records"
              description="Audit records will be recorded immutably as cases and recovery actions are executed."
              className="m-6 py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Log ID</th>
                    <th className="py-3 px-4 font-medium">Action</th>
                    <th className="py-3 px-4 font-medium">Entity Type</th>
                    <th className="py-3 px-4 font-medium">Actor</th>
                    <th className="py-3 px-4 font-medium">Timestamp</th>
                    <th className="py-3 px-4 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E232E]">
                  {logs.map((log) => {
                    const isExpanded = expandedLogId === log.log_id;
                    return (
                      <React.Fragment key={log.log_id}>
                        <tr className="hover:bg-[#181C24]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-amber-400">
                            {log.log_id.slice(0, 16)}...
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-stone-200">
                            {log.action}
                          </td>
                          <td className="py-3 px-4 font-mono text-stone-300">
                            {log.entity_type}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={log.actor_type === 'ai' ? 'gold' : 'blue'}>
                              {log.actor_type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-stone-400">{formatDate(log.created_at)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.log_id)}
                              className="text-stone-400 hover:text-stone-200 inline-flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#0F1117] border-b border-[#1E232E]">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                <div>
                                  <span className="text-stone-400 block mb-1">State Payload / Metadata:</span>
                                  <pre className="p-3 bg-[#13161C] border border-[#232733] rounded-lg overflow-x-auto text-[11px] text-amber-300/90">
                                    {JSON.stringify(log.after_state || log.metadata || {}, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-stone-400 block mb-1">Entity Reference ID:</span>
                                  <pre className="p-3 bg-[#13161C] border border-[#232733] rounded-lg overflow-x-auto text-[11px] text-stone-300">
                                    {log.entity_id}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
