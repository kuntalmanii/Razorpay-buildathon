import { Header } from '@/components/layout/header';
import { CommandCenter } from '@/features/dashboard/command-center';

export default function DashboardPage() {
  return (
    <>
      <Header
        title="RecoverIQ Command Center"
        subtitle="Real-time autonomous revenue recovery telemetry, failure breakdown, and active risk intervention"
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <CommandCenter />
      </main>
    </>
  );
}
