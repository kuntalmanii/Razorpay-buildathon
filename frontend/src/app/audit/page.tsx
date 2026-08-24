import { Header } from '@/components/layout/header';
import { AuditTimeline } from '@/features/audit/audit-timeline';

export default function AuditPage() {
  return (
    <>
      <Header
        title="Chronological Audit Trail"
        subtitle="Immutable ledger of webhook verification, risk calculation, AI reasoning, policy enforcement, and execution"
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <AuditTimeline />
      </main>
    </>
  );
}
