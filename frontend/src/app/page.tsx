import { Header } from '@/components/layout/header';
import { DashboardView } from '@/features/dashboard/dashboard-view';

export default function OverviewPage() {
  return (
    <>
      <Header
        title="Revenue Recovery Overview"
        subtitle="Real-time telemetry on payment failures, AI interventions, and recovered revenue"
      />
      <main className="flex-1 p-8 space-y-6 max-w-7xl">
        <DashboardView />
      </main>
    </>
  );
}
