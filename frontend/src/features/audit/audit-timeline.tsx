'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { formatDate, formatINR } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import {
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Filter,
  Lock,
  X,
} from 'lucide-react';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: string;
  status: 'success' | 'blocked' | 'failed' | 'duplicate' | 'pending';
  actor: string;
  description: string;
  correlationId?: string;
  details?: Record<string, unknown>;
}

export function AuditTimeline() {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesRes, actionsRes, webhooksRes, auditRes] = await Promise.all([
        apiClient.getRecoveryCases({ page: 1, limit: 20 }).catch(() => ({ cases: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })),
        apiClient.getRecoveryActions({ page: 1, limit: 20 }).catch(() => ({ actions: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })),
        apiClient.getWebhookEvents({ page: 1, limit: 20 }).catch(() => ({ events: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } })),
        apiClient.getAuditLogs({ page: 1, limit: 50 }).catch(() => ({ logs: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } })),
      ]);

      const events: TimelineEvent[] = [];
      const seenIds = new Set<string>();

      // 1. Immutable Audit Ledger Records (from DB audit_logs)
      for (const log of auditRes.logs || []) {
        const actionUpper = (log.action || '').toUpperCase();
        let status: 'success' | 'blocked' | 'failed' | 'duplicate' | 'pending' = 'success';
        if (actionUpper.includes('BLOCK') || actionUpper.includes('REJECT')) {
          status = 'blocked';
        } else if (actionUpper.includes('FAIL') || actionUpper.includes('ERROR')) {
          status = 'failed';
        } else if (actionUpper.includes('DUPLICATE')) {
          status = 'duplicate';
        } else if (actionUpper.includes('PENDING') || actionUpper.includes('SCHEDULE')) {
          status = 'pending';
        }

        const formattedAction = log.action.replace(/_/g, ' ').toUpperCase();
        const eventId = `audit_${log.log_id}`;
        seenIds.add(eventId);

        events.push({
          id: eventId,
          timestamp: log.created_at,
          eventType: formattedAction,
          status,
          actor: log.actor_id || log.actor_type || 'system_audit',
          description: `Immutable audit record: ${formattedAction} on ${log.entity_type} (${log.entity_id}).`,
          correlationId: log.entity_id,
          details: {
            logId: log.log_id,
            entityType: log.entity_type,
            entityId: log.entity_id,
            action: log.action,
            actorType: log.actor_type,
            actorId: log.actor_id,
            beforeState: log.before_state,
            afterState: log.after_state,
            metadata: log.metadata,
          },
        });
      }

      // 2. Webhook events (received & verified)
      for (const w of webhooksRes.events || []) {
        const eventId = `wh_${w.event_id}`;
        if (!seenIds.has(eventId)) {
          seenIds.add(eventId);
          events.push({
            id: eventId,
            timestamp: w.received_at,
            eventType: 'Webhook Ingress & Signature Check',
            status: w.signature_verified ? 'success' : 'failed',
            actor: 'razorpay_webhook_ingress',
            description: `Razorpay webhook event ${w.event_type} received with HMAC-SHA256 signature verification.`,
            correlationId: w.razorpay_event_id,
            details: {
              eventType: w.event_type,
              signatureVerified: w.signature_verified,
              processingStatus: w.processing_status,
            },
          });
        }
      }

      // 3. Risk case lifecycle events
      for (const c of casesRes.cases || []) {
        const caseId = `case_det_${c.case_id}`;
        if (!seenIds.has(caseId)) {
          seenIds.add(caseId);
          events.push({
            id: caseId,
            timestamp: c.detected_at,
            eventType: 'Case Created & Risk Evaluated',
            status: 'success',
            actor: 'revenue_risk_engine',
            description: `Detected payment failure (${c.failure_category}) for ${formatINR(Number(c.amount_at_risk))}. Risk score: ${c.risk_score}/100.`,
            correlationId: c.case_id,
            details: {
              caseId: c.case_id,
              failureCategory: c.failure_category,
              riskScore: c.risk_score,
              recoveryProbability: c.recovery_probability,
            },
          });
        }

        if (c.status === 'recovered' && c.resolved_at) {
          const resId = `case_res_${c.case_id}`;
          if (!seenIds.has(resId)) {
            seenIds.add(resId);
            events.push({
              id: resId,
              timestamp: c.resolved_at,
              eventType: 'Payment Recovered & Settled',
              status: 'success',
              actor: 'payment_verifier',
              description: `Payment successfully recovered for ${formatINR(Number(c.recovered_amount || c.amount_at_risk))}. Case state marked RECOVERED.`,
              correlationId: c.case_id,
              details: {
                caseId: c.case_id,
                status: c.status,
                resolvedAt: c.resolved_at,
              },
            });
          }
        }
      }

      // 4. Recovery Actions executed & policy verified
      for (const a of actionsRes.actions || []) {
        const actId = `act_${a.action_id}`;
        if (!seenIds.has(actId)) {
          seenIds.add(actId);
          events.push({
            id: actId,
            timestamp: a.created_at,
            eventType: 'Recovery Action Executed',
            status: a.execution_status === 'completed' ? 'success' : a.execution_status === 'failed' ? 'failed' : 'pending',
            actor: 'recovery_executor',
            description: `Dispatched action ${a.action_type.replace(/_/g, ' ')} under deterministic safety policy. Execution: ${a.execution_status.toUpperCase()}.`,
            correlationId: a.idempotency_key || a.action_id,
            details: {
              actionId: a.action_id,
              executionStatus: a.execution_status,
              result: a.result,
            },
          });
        }
      }

      // Sort strictly descending by chronological timestamp
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setTimelineEvents(events);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Filtered timeline
  const filteredEvents = timelineEvents.filter((evt) => {
    if (statusFilter && evt.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        evt.eventType.toLowerCase().includes(q) ||
        evt.description.toLowerCase().includes(q) ||
        evt.actor.toLowerCase().includes(q) ||
        evt.correlationId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header & Controls Toolbar */}
      <div className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#817A70] pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit timeline by event, actor, correlation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Status Filter & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#817A70]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter audit timeline by status"
              className="bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[#B89A62]/50 font-mono"
            >
              <option value="">All Event Statuses</option>
              <option value="success">Success / Verified</option>
              <option value="blocked">Policy Blocked</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAuditData}
            aria-label="Refresh timeline"
            className="h-7 w-7 p-0 text-[#817A70] hover:text-[#F2EDE3]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Timeline Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>System & Lifecycle Audit Ledger</CardTitle>
            <CardDescription>
              Chronological immutable event trail from webhook arrival to verified revenue recovery
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#817A70] font-mono">
            <Lock className="w-3.5 h-3.5 text-[#B89A62]" />
            <span>Cryptographic HMAC & DB Logs</span>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {error ? (
            <ErrorState title="Could not load audit ledger" message={error} onRetry={fetchAuditData} />
          ) : loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title="No Audit Events Recorded"
              description="Chronological events (webhook verified, risk scored, AI decision, policy approval, action execution) will appear here."
              className="py-12"
            />
          ) : (
            <div className="relative pl-6 border-l border-[rgba(242,237,227,0.10)] space-y-4">
              {filteredEvents.map((evt, idx) => {
                const isExpanded = expandedId === evt.id;

                const nodeBg =
                  evt.status === 'success'
                    ? 'bg-[#6F9B7A]'
                    : evt.status === 'blocked'
                    ? 'bg-[#B68B4F]'
                    : evt.status === 'failed'
                    ? 'bg-[#B56F68]'
                    : 'bg-[#817A70]';

                return (
                  <div
                    key={evt.id}
                    style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
                    className="relative group motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-150"
                  >
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[28px] top-3 w-2 h-2 rounded-full ${nodeBg} ring-2 ring-[#151513]`}
                    />

                    {/* Event Card */}
                    <div className="p-3.5 rounded-lg bg-[#181714] border border-[rgba(242,237,227,0.08)] hover:border-[rgba(242,237,227,0.15)] transition-colors duration-150 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-[#F2EDE3] font-mono">
                            {evt.eventType}
                          </span>
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                              evt.status === 'success'
                                ? 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/20'
                                : evt.status === 'blocked'
                                ? 'bg-[#B68B4F]/10 text-[#B68B4F] border-[#B68B4F]/20'
                                : evt.status === 'failed'
                                ? 'bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/20'
                                : 'bg-[#817A70]/10 text-[#817A70] border-[#817A70]/20'
                            }`}
                          >
                            {evt.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-[#817A70]">
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-3 h-3" />
                            {formatDate(evt.timestamp)}
                          </span>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                            className="text-[#817A70] hover:text-[#F2EDE3] p-0.5 rounded transition-colors"
                            aria-label="Toggle technical details"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#B7B0A3] leading-relaxed">{evt.description}</p>

                      <div className="flex flex-wrap items-center justify-between pt-1.5 text-[10px] text-[#817A70] border-t border-[rgba(242,237,227,0.06)] gap-2 font-mono">
                        <span>Actor: {evt.actor}</span>
                        {evt.correlationId && (
                          <span className="text-[#D1B982] truncate max-w-xs">
                            Ref: {evt.correlationId}
                          </span>
                        )}
                      </div>

                      {/* Expandable Technical Details */}
                      {isExpanded && evt.details && (
                        <div className="pt-2.5 border-t border-[rgba(242,237,227,0.06)] space-y-1.5 animate-in fade-in duration-100">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#817A70] block">
                            Sanitized Technical Payload:
                          </span>
                          <pre className="p-2.5 bg-[#151513] border border-[rgba(242,237,227,0.08)] rounded text-[10px] font-mono text-[#D1B982] overflow-x-auto">
                            {JSON.stringify(evt.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
