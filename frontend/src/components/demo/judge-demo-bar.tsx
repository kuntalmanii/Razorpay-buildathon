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
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-stone-950" />
          <span>Launch Live Demo Scenarios</span>
          <span className="text-[10px] bg-stone-950/20 px-1.5 py-0.5 rounded font-mono">4 Scenarios</span>
        </button>
      </div>

      {/* Demo Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0F1117] border border-[#232733] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1E232E] flex items-center justify-between bg-[#13161C]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Play className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                    RecoverIQ Interactive Judge Demonstration
                  </h3>
                  <p className="text-xs text-stone-400">
                    Live verification of AI reasoning, deterministic policy safety, and fault recovery.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-[#1E232E] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 gap-3">
                {DEMO_SCENARIOS.map((scen) => {
                  const Icon = scen.icon;
                  const isRunning = runningScenario === scen.id;

                  return (
                    <div
                      key={scen.id}
                      className="p-4 rounded-xl bg-[#141820] border border-[#232733] hover:border-amber-500/30 transition-all flex items-start justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1D222E] flex items-center justify-center text-stone-300 flex-shrink-0 mt-0.5 group-hover:text-amber-400 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-stone-200">{scen.name}</span>
                            <Badge variant="gold" className="text-[10px] py-0 px-1.5">
                              {scen.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-stone-400 leading-relaxed">{scen.description}</p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        disabled={runningScenario !== null}
                        onClick={() => handleRunScenario(scen)}
                        className="flex-shrink-0 gap-1.5 text-xs py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
                      >
                        <Play className={`w-3 h-3 ${isRunning ? 'animate-spin' : 'fill-stone-950'}`} />
                        {isRunning ? 'Running...' : 'Execute'}
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Execution Error Banner */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Scenario Execution Result Visualizer */}
              {scenarioResult && (
                <div className="mt-4 p-4 rounded-xl bg-[#11141B] border border-emerald-500/30 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E232E]">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Scenario Execution Verified
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">
                      Outcome: <strong className="text-emerald-300">{scenarioResult.finalOutcome}</strong>
                    </span>
                  </div>

                  {/* Execution Timeline Steps */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Execution Step Telemetry
                    </span>
                    {scenarioResult.steps.map((step) => (
                      <div
                        key={step.step}
                        className="p-2.5 rounded-lg bg-[#0F1117] border border-[#1E232E] text-xs flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {step.step}
                        </span>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-200">{step.name}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                step.status === 'PASSED' || step.status === 'RECOVERED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : step.status === 'BLOCKED_BY_SAFETY'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}
                            >
                              {step.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 font-mono">{step.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Safety Guarantees Verified */}
                  {scenarioResult.safetyGuaranteesEnforced && (
                    <div className="pt-2 border-t border-[#1E232E] space-y-1">
                      <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                        Safety Guarantees Enforced:
                      </span>
                      <ul className="text-[11px] text-stone-300 space-y-0.5">
                        {scenarioResult.safetyGuaranteesEnforced.map((g, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
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
            <div className="p-4 border-t border-[#1E232E] bg-[#13161C] flex items-center justify-between text-xs text-stone-400">
              <span className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-amber-400" /> Powered by RecoverIQ Autonomous Safety Architecture
              </span>
              <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} className="text-xs">
                Close Demo
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
