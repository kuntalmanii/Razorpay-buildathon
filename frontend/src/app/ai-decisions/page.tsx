import { Header } from '@/components/layout/header';
import { AiDecisionsFeed } from '@/features/ai-decisions/ai-decisions-feed';

export default function AiDecisionsPage() {
  return (
    <>
      <Header
        title="AI Decision & Policy Safety Engine"
        subtitle="3-Tier Separation: AI Recommendation (Advisory) → Policy Decision (Enforced) → Execution Result (Dispatched)"
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <AiDecisionsFeed />
      </main>
    </>
  );
}
