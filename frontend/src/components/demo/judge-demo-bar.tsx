'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ScenarioRunResult } from '@/types/api';
import { Play, ShieldAlert, Zap, Layers, CheckCircle2, AlertTriangle, X, Bot, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface DemoScenario {
  id: string;
  name: string;
  badge: string;
  description: string;
  simulationType: string;
  icon: React.ElementType;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'scen_1',
    name: 'Scenario 1: Full Recovery Lifecycle',
    badge: 'AI + Policy + Recovery',
    description: 'Failed payment → AI diagnoses context → Policy approves → Recovery link dispatched → Recovered.',
    simulationType: 'PAYMENT_ALREADY_SUCCESSFUL',
    icon: Zap,
  },
  {
    id: 'scen_2',
    name: 'Scenario 2: Unsafe AI Recommendation Blocked',
    badge: 'Safety Policy Gate',
    description: 'Malformed or aggressive AI proposal intercepted by schema parser and policy engine.',
    simulationType: 'AI_MALFORMED_RESPONSE',
    icon: ShieldAlert,
  },
  {
    id: 'scen_3',
    name: 'Scenario 3: Gateway Timeout & Safe Retry',
    badge: 'Zero Double-Billing',
    description: 'Razorpay 504 timeout → Uncertainty detected → State queried → Retried safely.',
    simulationType: 'RAZORPAY_TIMEOUT',
    icon: Layers,
  },
  {
    id: 'scen_4',
    name: 'Scenario 4: Duplicate Webhook Defense',
    badge: 'Idempotency Shield',
    description: 'Repeated x-razorpay-event-id delivered → DB constraint catches event → Duplicate ignored.',
    simulationType: 'DUPLICATE_WEBHOOK',
    icon: CheckCircle2,
  },
];

export function JudgeDemoBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [runningScenario, setRunningScenario] = useState<string | null>(null);
  const [scenarioResult, setScenarioResult] = useState<ScenarioRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunScenario = async (scen: DemoScenario) => {
    setRunningScenario(scen.id);
    setScenarioResult(null);
    setError(null);

    try {
      const result = await apiClient.runSimulationScenario(scen.simulationType);
      setScenarioResult(result);
    } catch (err) {
      setError((err as Error).message || 'Simulation execution failed');
    } finally {
      setRunningScenario(null);
    }
  };

  return (
    <>
      {/* Floating Demo Trigger Ribbon */}
      <div className="fixed bottom-5 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-md bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] font-semibold text-xs shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-[#D1B982]/30"
        >
          <Play className="w-3.5 h-3.5 fill-[#151513]" />
          <span>Launch Live Demo Scenarios</span>
          <span className="text-[10px] bg-[#151513]/15 px-1.5 py-0.2 rounded font-mono">4 Scenarios</span>
        </button>
      </div>

      {/* Demo Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-lg bg-[#151513] border border-[rgba(242,237,227,0.12)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[rgba(242,237,227,0.08)] flex items-center justify-between bg-[#1C1B18]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#B89A62]/10 border border-[#B89A62]/25 flex items-center justify-center text-[#D1B982]">
                  <Play className="w-3.5 h-3.5 fill-[#D1B982]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#F2EDE3] tracking-tight">
                    RecoverIQ Live Judge Demonstration
                  </h3>
                  <p className="text-xs text-[#817A70]">
                    Live verification of AI reasoning, deterministic policy safety, and fault recovery.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#817A70] hover:text-[#F2EDE3] p-1.5 rounded-md hover:bg-[#24221E] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 gap-2.5">
                {DEMO_SCENARIOS.map((scen) => {
                  const Icon = scen.icon;
                  const isRunning = runningScenario === scen.id;

                  return (
                    <div
                      key={scen.id}
                      className="p-3.5 rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.08)] hover:border-[#B89A62]/30 transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-md bg-[#24221E] flex items-center justify-center text-[#817A70] flex-shrink-0 mt-0.5 group-hover:text-[#D1B982] transition-colors">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-[#F2EDE3]">{scen.name}</span>
                            <Badge variant="gold" className="text-[10px] py-0 px-1.5">
                              {scen.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-[#B7B0A3] leading-relaxed">{scen.description}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        disabled={runningScenario !== null}
                        onClick={() => handleRunScenario(scen)}
                        className="flex-shrink-0 gap-1 text-xs py-1 px-2.5 h-7"
                      >
                        <Play className={`w-3 h-3 ${isRunning ? 'animate-spin' : 'fill-[#151513]'}`} />
                        {isRunning ? 'Running...' : 'Execute'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Execution Error Banner */}
              {error && (
                <div className="p-3.5 rounded-lg bg-[#B56F68]/10 border border-[#B56F68]/20 text-xs text-[#B56F68] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#B56F68] flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Scenario Execution Result Visualizer */}
              {scenarioResult && (
                <div className="mt-3 p-4 rounded-lg bg-[#1E1D19] border border-[#6F9B7A]/30 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-[rgba(242,237,227,0.08)]">
                    <span className="text-xs font-semibold text-[#6F9B7A] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Scenario Execution Verified
                    </span>
                    <span className="text-[10px] font-mono text-[#817A70]">
                      Outcome: <strong className="text-[#6F9B7A]">{scenarioResult.finalOutcome}</strong>
                    </span>
                  </div>

                  {/* Execution Timeline Steps */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#817A70]">
                      Execution Step Telemetry
                    </span>
                    {scenarioResult.steps.map((step) => (
                      <div
                        key={step.step}
                        className="p-2.5 rounded bg-[#181714] border border-[rgba(242,237,227,0.06)] text-xs flex items-start gap-2.5"
                      >
                        <span className="w-4 h-4 rounded bg-[#6F9B7A]/10 border border-[#6F9B7A]/20 text-[#6F9B7A] font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {step.step}
                        </span>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#F2EDE3]">{step.name}</span>
                            <span
                              className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded ${
                                step.status === 'PASSED' || step.status === 'RECOVERED'
                                  ? 'bg-[#6F9B7A]/10 text-[#6F9B7A]'
                                  : step.status === 'BLOCKED_BY_SAFETY'
                                  ? 'bg-[#B68B4F]/10 text-[#B68B4F]'
                                  : 'bg-[#B56F68]/10 text-[#B56F68]'
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#817A70] font-mono">{step.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Safety Guarantees Verified */}
                  {scenarioResult.safetyGuaranteesEnforced && (
                    <div className="pt-2 border-t border-[rgba(242,237,227,0.08)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#817A70]">
                        Safety Guarantees Enforced:
                      </span>
                      <ul className="text-[11px] text-[#B7B0A3] space-y-0.5 font-mono">
                        {scenarioResult.safetyGuaranteesEnforced.map((g, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-[#6F9B7A] flex-shrink-0" />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[rgba(242,237,227,0.08)] bg-[#1C1B18] flex items-center justify-between text-xs text-[#817A70]">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Bot className="w-3.5 h-3.5 text-[#B89A62]" /> RecoverIQ Deterministic Architecture
              </span>
              <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="text-xs h-7">
                Close Demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
