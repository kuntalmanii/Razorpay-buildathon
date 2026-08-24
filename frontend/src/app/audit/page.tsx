import { Header } from '@/components/layout/header';
import { AuditView } from '@/features/audit/audit-view';

export default function AuditPage() {
  return (
    <>
      <Header
        title="Audit Trail & Traceability"
        subtitle="Immutable chronological ledger of system state changes, policy reviews, and action outcomes"
      />
      <main className="flex-1 p-8 space-y-6 max-w-7xl">
        <AuditView />
      </main>
    </>
  );
}
