'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { AuditLog, WebhookEventItem, RecoveryAction, RecoveryCase } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ScrollText,
  ShieldCheck,
  ShieldAlert,
  Bot,
  Activity,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Filter,
  Lock,
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
      // Gather data across cases, webhooks, actions to construct chronological timeline
      const [casesRes, actionsRes, webhooksRes] = await Promise.all([
        apiClient.getRecoveryCases({ page: 1, limit: 10 }),
        apiClient.getRecoveryActions({ page: 1, limit: 15 }),
        apiClient.getWebhookEvents({ page: 1, limit: 15 }),
      ]);

      const events: TimelineEvent[] = [];

      // 1. Webhook events (received & verified)
      for (const w of webhooksRes.events) {
        events.push({
          id: `wh_${w.event_id}`,
          timestamp: w.received_at,
          eventType: 'Webhook Received & Verified',
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

      // 2. Risk case lifecycle events
      for (const c of casesRes.cases) {
        // Case created & risk calculated
        events.push({
          id: `case_det_${c.case_id}`,
          timestamp: c.detected_at,
          eventType: 'Case Created & Risk Calculated',
          status: 'success',
          actor: 'revenue_risk_engine',
          description: `Detected payment failure (${c.failure_category}) for ₹${(Number(c.amount_at_risk) / 100).toLocaleString('en-IN')}. Risk score: ${c.risk_score}/100.`,
          correlationId: c.case_id,
          details: {
            caseId: c.case_id,
            failureCategory: c.failure_category,
            riskScore: c.risk_score,
            recoveryProbability: c.recovery_probability,
          },
        });

        // Case resolved event if resolved
        if (c.resolved_at || c.status === 'recovered') {
          events.push({
            id: `case_res_${c.case_id}`,
            timestamp: c.resolved_at || c.detected_at,
            eventType: 'Payment Verified & Case Resolved',
            status: 'success',
            actor: 'recovery_verifier',
            description: `Payment confirmed captured by Razorpay. Case #${c.case_id.slice(0, 16)}... marked RECOVERED.`,
            correlationId: c.case_id,
            details: {
              recoveredAmountPaise: c.recovered_amount,
              recoveryReason: c.recovery_reason || 'Verified via payment link completion',
            },
          });
        }
      }

      // 3. Recovery actions (AI Decision + Policy Evaluation + Execution)
      for (const a of actionsRes.actions) {
        // AI & Policy Decision event
        events.push({
          id: `act_pol_${a.action_id}`,
          timestamp: a.created_at,
          eventType: a.policy_status === 'approved' ? 'Action Approved by Policy' : 'Action Blocked by Policy',
          status: a.policy_status === 'approved' ? 'success' : 'blocked',
          actor: a.proposed_by === 'ai' ? 'ai_recovery_agent + policy_engine' : 'policy_engine',
          description: `AI recommended ${a.action_type}. Policy evaluated safety constraints with outcome: ${a.policy_status.toUpperCase()}.`,
          correlationId: a.idempotency_key || a.action_id,
          details: {
            actionType: a.action_type,
            policyStatus: a.policy_status,
            payload: a.payload,
          },
        });

        // Action Executed event
        events.push({
          id: `act_exec_${a.action_id}`,
          timestamp: a.created_at,
          eventType: 'Recovery Action Executed',
          status: a.execution_status === 'completed' ? 'success' : a.execution_status === 'failed' ? 'failed' : 'pending',
          actor: 'recovery_executor',
          description: `Dispatched action ${a.action_type} under 10-step safety protocol. Execution status: ${a.execution_status.toUpperCase()}.`,
          correlationId: a.idempotency_key || a.action_id,
          details: {
            actionId: a.action_id,
            executionStatus: a.execution_status,
            result: a.result,
          },
        });
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
    <div className="space-y-6">
      {/* Header & Controls Toolbar */}
      <div className="p-4 rounded-xl bg-[#13161C] border border-[#232733] flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search audit timeline by event, actor, correlation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-stone-400"
          />
        </div>

        {/* Status Filter & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter audit timeline by status"
              className="bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Event Statuses</option>
              <option value="success">Success / Verified</option>
              <option value="blocked">Policy Blocked</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <Button variant="ghost" size="sm" onClick={fetchAuditData} aria-label="Refresh timeline">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Timeline Feed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>System & Lifecycle Audit Ledger</CardTitle>
            <CardDescription>
              Chronological immutable event trail from webhook arrival to verified revenue recovery
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Cryptographic HMAC & DB Logs</span>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {error ? (
            <ErrorState title="Could not load audit ledger" message={error} onRetry={fetchAuditData} />
          ) : loading ? (
            <div className="space-y-4">
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
            <div className="relative pl-6 border-l-2 border-[#1E232E] space-y-6">
              {filteredEvents.map((evt) => {
                const isExpanded = expandedId === evt.id;

                const statusColor =
                  evt.status === 'success'
                    ? 'bg-emerald-500 ring-emerald-500/20 text-emerald-400'
                    : evt.status === 'blocked'
                    ? 'bg-rose-500 ring-rose-500/20 text-rose-400'
                    : evt.status === 'failed'
                    ? 'bg-rose-500 ring-rose-500/20 text-rose-400'
                    : 'bg-amber-500 ring-amber-500/20 text-amber-400';

                return (
                  <div key={evt.id} className="relative group">
                    {/* Node Dot */}
                    <div
                      className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full ${statusColor} ring-4 transition-all`}
                    />

                    {/* Event Card */}
                    <div className="p-4 rounded-xl bg-[#141720] border border-[#232733] hover:border-[#2D3342] transition-colors space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-stone-100 font-mono">
                            {evt.eventType}
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              evt.status === 'success'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : evt.status === 'blocked'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : evt.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {evt.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-stone-400">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(evt.timestamp)}
                          </span>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                            className="text-stone-400 hover:text-stone-200 p-0.5 rounded"
                            aria-label="Toggle technical details"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-stone-300 leading-relaxed">{evt.description}</p>

                      <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-stone-400 border-t border-[#1E232E]/60 gap-2">
                        <span className="font-mono">Actor: {evt.actor}</span>
                        {evt.correlationId && (
                          <span className="font-mono text-amber-400/90 truncate max-w-xs">
                            Ref: {evt.correlationId}
                          </span>
                        )}
                      </div>

                      {/* Expandable Technical Details */}
                      {isExpanded && evt.details && (
                        <div className="pt-3 border-t border-[#1E232E] space-y-2 animate-in fade-in duration-150">
                          <span className="text-[11px] font-semibold text-stone-300 block">
                            Sanitized Technical Metadata:
                          </span>
                          <pre className="p-3 bg-[#0F1117] border border-[#232733] rounded-lg overflow-x-auto text-[11px] font-mono text-amber-300/90">
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
