import { Header } from '@/components/layout/header';
import { AiDecisionsView } from '@/features/ai-decisions/ai-decisions-view';

export default function AiDecisionsPage() {
  return (
    <>
      <Header
        title="AI Decisions & Safety Engine"
        subtitle="Review autonomous AI recovery recommendations and deterministic policy gate validations"
      />
      <main className="flex-1 p-8 space-y-6 max-w-7xl">
        <AiDecisionsView />
      </main>
    </>
  );
}
