import { Header } from '@/components/layout/header';
import { RecoveryCasesList } from '@/features/recovery-cases/recovery-cases-list';

export default function RecoveryCasesPage() {
  return (
    <>
      <Header
        title="Revenue Risk Cases"
        subtitle="Manage, filter, and inspect payment failure cases monitored by RecoverIQ"
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <RecoveryCasesList />
      </main>
    </>
  );
}
