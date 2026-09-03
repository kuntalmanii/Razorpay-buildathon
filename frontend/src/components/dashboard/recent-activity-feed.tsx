'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AuditLog, RecoveryAction } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  Activity,
  ArrowUpRight,
  FileText,
} from 'lucide-react';

interface RecentActivityFeedProps {
  auditLogs: AuditLog[];
  actions: RecoveryAction[];
}

export function RecentActivityFeed({
  auditLogs,
  actions,
}: RecentActivityFeedProps) {
  // Combine audit events and actions into a unified chronological feed
  const events = useMemo(() => {
    type UnifiedEvent = {
      id: string;
      title: string;
      details: string;
      timestamp: string;
      status: string;
      variant: 'success' | 'warning' | 'info' | 'neutral';
      caseId?: string;
    };

    const list: UnifiedEvent[] = [];

    // Map audit logs
    for (const log of auditLogs.slice(0, 6)) {
      let variant: UnifiedEvent['variant'] = 'neutral';
      if (log.action.includes('recovered') || log.action.includes('success')) {
        variant = 'success';
      } else if (log.action.includes('failed') || log.action.includes('risk')) {
        variant = 'warning';
      } else if (log.action.includes('policy') || log.action.includes('approved')) {
        variant = 'info';
      }

      const cleanAction = log.action.replace(/_/g, ' ').toUpperCase();
      const entityLabel = log.entity_type
        ? log.entity_type.replace(/_/g, ' ')
        : 'Entity';

      list.push({
        id: `audit_${log.log_id}`,
        title: cleanAction,
        details: `${entityLabel} #${log.entity_id ? log.entity_id.slice(-6).toUpperCase() : ''} (${log.actor_type})`,
        timestamp: log.created_at,
        status: log.actor_type.toUpperCase(),
        variant,
        caseId: log.entity_type === 'revenue_risk_cases' ? log.entity_id : undefined,
      });
    }

    // Map actions
    for (const act of actions.slice(0, 6)) {
      let variant: UnifiedEvent['variant'] = 'neutral';
      if (act.execution_status === 'completed') variant = 'success';
      else if (act.execution_status === 'failed') variant = 'warning';
      else if (act.execution_status === 'scheduled' || act.execution_status === 'executing') variant = 'info';

      list.push({
        id: `action_${act.action_id}`,
        title: `${act.action_type.replace(/_/g, ' ').toUpperCase()}`,
        details: `Dispatched by ${act.proposed_by} for Case #${act.case_id.slice(-6).toUpperCase()}`,
        timestamp: act.created_at,
        status: act.execution_status.toUpperCase(),
        variant,
        caseId: act.case_id,
      });
    }

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return list.slice(0, 7);
  }, [auditLogs, actions]);

  return (
    <div className="p-5 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#71879A]/15 border border-[#71879A]/30 flex items-center justify-center text-[#71879A]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#F2EDE3]">
              Recent Operational Activity
            </h2>
            <p className="text-xs text-[#817A70] mt-0.5">
              Live deterministic audit trail and execution dispatch events
            </p>
          </div>
        </div>

        <Link
          href="/audit"
          className="text-xs font-mono text-[#D1B982] hover:text-[#F2EDE3] flex items-center gap-1 transition-colors self-start sm:self-auto"
        >
          Full audit trail <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Empty State */}
      {events.length === 0 ? (
        <div className="py-8 px-4 rounded-lg bg-[#151513]/60 border border-[rgba(242,237,227,0.06)] text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#71879A]/15 border border-[#71879A]/30 flex items-center justify-center mx-auto text-[#71879A]">
            <FileText className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-[#F2EDE3]">
            No recent activity recorded
          </h3>
          <p className="text-[11px] text-[#817A70] max-w-md mx-auto">
            Operational activity will log here as payment failure webhooks arrive and recovery actions dispatch.
          </p>
        </div>
      ) : (
        /* Event Stream */
        <div className="divide-y divide-[rgba(242,237,227,0.06)]">
          {events.map((ev) => {
            const isSuccess = ev.variant === 'success';
            const isWarning = ev.variant === 'warning';
            const isInfo = ev.variant === 'info';

            return (
              <div
                key={ev.id}
                className="py-3 px-1 flex items-center justify-between gap-4 hover:bg-[#24221E]/50 transition-colors rounded"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSuccess
                        ? 'bg-[#6F9B7A]'
                        : isWarning
                        ? 'bg-[#B56F68]'
                        : isInfo
                        ? 'bg-[#D1B982]'
                        : 'bg-[#817A70]'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[#F2EDE3]">
                        {ev.title}
                      </span>
                      {ev.caseId && (
                        <Link
                          href={`/recovery-cases/${ev.caseId}`}
                          className="font-mono text-[10px] text-[#D1B982] hover:underline"
                        >
                          #{ev.caseId.slice(-6).toUpperCase()}
                        </Link>
                      )}
                    </div>
                    <p className="text-[11px] text-[#817A70] truncate mt-0.5">
                      {ev.details}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                      isSuccess
                        ? 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/25'
                        : isWarning
                        ? 'bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/25'
                        : 'bg-[#24221E] text-[#B7B0A3] border-[rgba(242,237,227,0.08)]'
                    }`}
                  >
                    {ev.status}
                  </span>
                  <div className="font-mono text-[10px] text-[#817A70] mt-0.5">
                    {formatDate(ev.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
