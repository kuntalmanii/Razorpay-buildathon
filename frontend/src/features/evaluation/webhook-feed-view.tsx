'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { WebhookEventItem } from '@/types/api';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { TableRowSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, ShieldCheck, Play, RefreshCw } from 'lucide-react';

export function WebhookFeedView() {
  const [events, setEvents] = useState<WebhookEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulation controls
  const [simEventType, setSimEventType] = useState('payment.failed');
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getWebhookEvents({ page: 1, limit: 20 });
      setEvents(res.events);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimMessage(null);
    try {
      await apiClient.simulateWebhook(simEventType);
      setSimMessage(`Simulated ${simEventType} event successfully processed!`);
      await fetchEvents();
    } catch (err) {
      setSimMessage(`Simulation failed: ${(err as Error).message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dev Simulator Panel */}
      <Card glow className="border-amber-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" /> Razorpay Test Webhook
                Simulator
              </CardTitle>
              <CardDescription>
                Simulate inbound Razorpay webhook events to test risk categorization, AI decision, and policy execution.
              </CardDescription>
            </div>
            <Badge variant="gold">Test Mode Only</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={simEventType}
              onChange={(e) => setSimEventType(e.target.value)}
              aria-label="Select webhook event type to simulate"
              className="bg-[#181C24] border border-[#282E3B] text-stone-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="payment.failed">payment.failed (Triggers Risk Case Creation)</option>
              <option value="payment.captured">payment.captured (Triggers Recovery Resolution)</option>
              <option value="subscription.halted">subscription.halted (Mandate Failure)</option>
              <option value="payment_link.paid">payment_link.paid (Recovery Link Resolution)</option>
            </select>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSimulate}
              disabled={simulating}
              className="gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-stone-950" />
              {simulating ? 'Delivering Webhook...' : 'Simulate Ingestion'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchEvents}
              disabled={loading}
              className="gap-1.5 ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
            </Button>
          </div>

          {simMessage && (
            <p className="text-xs text-amber-400 mt-3 font-mono bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              {simMessage}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Webhook Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ingested Webhook Events</CardTitle>
          <CardDescription>
            HMAC-SHA256 signature verified inbound webhook deliveries from Razorpay
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-6">
              <ErrorState title="Could not load webhook feed" message={error} onRetry={fetchEvents} />
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
          ) : events.length === 0 ? (
            <EmptyState
              title="No Webhook Events Ingested"
              description="Click 'Simulate Ingestion' above to deliver a test payment event."
              className="m-6 py-12"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0F1117] text-stone-400 border-b border-[#1E232E]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Razorpay Event ID</th>
                    <th className="py-3 px-4 font-medium">Event Type</th>
                    <th className="py-3 px-4 font-medium">Signature</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Received At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E232E]">
                  {events.map((evt) => (
                    <tr key={evt.event_id} className="hover:bg-[#181C24]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-amber-400">
                        {evt.razorpay_event_id}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-stone-200">
                        {evt.event_type}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={evt.signature_verified ? 'emerald' : 'rose'}>
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          {evt.signature_verified ? 'HMAC Verified' : 'Invalid Signature'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          {evt.processing_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-stone-400">{formatDate(evt.received_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
