import { Header } from '@/components/layout/header';
import { EvaluationDashboard } from '@/features/evaluation/evaluation-dashboard';

export default function EvaluationPage() {
  return (
    <>
      <Header
        title="Benchmark & System Evaluation"
        subtitle="Empirical evidence of recovery performance, algorithmic precision, business impact, and fault resiliency"
      />
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl">
        <EvaluationDashboard />
      </main>
    </>
  );
}
