import { Header } from '@/components/layout/header';
import { WebhookFeedView } from '@/features/evaluation/webhook-feed-view';

export default function EvaluationPage() {
  return (
    <>
      <Header
        title="Webhook Ingestion & Simulation"
        subtitle="Live telemetry for Razorpay webhook deliveries, HMAC-SHA256 signature verification, and simulator"
      />
      <main className="flex-1 p-8 space-y-6 max-w-7xl">
        <WebhookFeedView />
      </main>
    </>
  );
}
