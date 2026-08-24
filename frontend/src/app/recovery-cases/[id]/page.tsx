import { Header } from '@/components/layout/header';
import { RecoveryCaseDetail } from '@/features/recovery-cases/recovery-case-detail';

interface CasePageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { id } = await params;

  return (
    <>
      <Header
        title="Case Investigation & Audit"
        subtitle={`Case ID: ${id} • Telemetry, AI Reasoning, and Policy Validation`}
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <RecoveryCaseDetail caseId={id} />
      </main>
    </>
  );
}
