import { Header } from '@/components/layout/header';
import { RecoveryCasesView } from '@/features/recovery-cases/recovery-cases-view';

export default function RecoveryCasesPage() {
  return (
    <>
      <Header
        title="Revenue Risk Cases"
        subtitle="Manage and inspect deterministic risk cases generated from Razorpay payment failures"
      />
      <main className="flex-1 p-8 space-y-6 max-w-7xl">
        <RecoveryCasesView />
      </main>
    </>
  );
}
