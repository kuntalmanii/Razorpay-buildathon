import { Header } from '@/components/layout/header';
import { CaseDecisionDeepDive } from '@/features/ai-decisions/case-decision-deep-dive';

interface CaseDecisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDecisionPage({ params }: CaseDecisionPageProps) {
  const { id } = await params;

  return (
    <>
      <Header
        title="AI Reasoning & Policy Deep Dive"
        subtitle={`Case ID: ${id} • Evidence, Confidence, Reasoning, and Safety Gates`}
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <CaseDecisionDeepDive caseId={id} />
      </main>
    </>
  );
}
