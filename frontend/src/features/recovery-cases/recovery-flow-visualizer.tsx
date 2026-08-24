'use client';

import React from 'react';
import { RecoveryCase, RecoveryAction, AuditLog } from '@/types/api';
import { formatINR, formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  Activity,
  Bot,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Award,
  ArrowRight,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface RecoveryFlowVisualizerProps {
  caseData: RecoveryCase;
  actions?: RecoveryAction[];
  auditLogs?: AuditLog[];
  className?: string;
}

type StepStatus = 'completed' | 'current' | 'pending' | 'blocked' | 'failed' | 'skipped';

interface FlowStep {
  id: string;
  name: string;
  sublabel: string;
  status: StepStatus;
  timestamp?: string;
  description: string;
  icon: React.ElementType;
}

export function RecoveryFlowVisualizer({
  caseData,
  actions = [],
  auditLogs = [],
  className,
}: RecoveryFlowVisualizerProps) {
  const latestAction = actions[0];
  const payload = latestAction?.payload as Record<string, unknown> | undefined;

  const isRecovered = caseData.status === 'recovered';
  const isBlocked = latestAction?.policy_status === 'rejected';
  const isFailedAction = latestAction?.execution_status === 'failed';
  const hasAiDecision = Boolean(latestAction || auditLogs.some((l) => l.actor_type === 'ai'));
  const hasPolicyDecision = Boolean(latestAction?.policy_status || isRecovered);
  const hasActionExecuted = Boolean(latestAction?.execution_status === 'completed' || isRecovered);

  const aiDecisionName =
    (payload?.decision as string) ||
    latestAction?.action_type.replace(/_/g, ' ').toUpperCase() ||
    (caseData.failure_category.includes('insufficient') ? 'PAYMENT LINK' : 'SCHEDULE RETRY');

  const confidence =
    typeof payload?.confidence === 'number'
      ? payload.confidence
      : Number(caseData.recovery_probability);

  // Build the 7 Steps
  const steps: FlowStep[] = [
    // 1. DETECTED
    {
      id: 'detected',
      name: 'DETECTED',
      sublabel: 'Payment Ingress',
      status: 'completed',
      timestamp: caseData.detected_at,
      description: `Razorpay payment failure (${caseData.failure_category})`,
      icon: AlertTriangle,
    },

    // 2. DIAGNOSED
    {
      id: 'diagnosed',
      name: 'DIAGNOSED',
      sublabel: 'Risk Calculation',
      status: 'completed',
      timestamp: caseData.detected_at,
      description: `Risk: ${caseData.risk_score}/100 • Recovery Prob: ${(Number(caseData.recovery_probability) * 100).toFixed(0)}%`,
      icon: Activity,
    },

    // 3. AI RECOMMENDATION
    {
      id: 'ai_recommendation',
      name: 'AI PROPOSAL',
      sublabel: 'Advisory Reasoning',
      status: hasAiDecision || hasPolicyDecision || isRecovered ? 'completed' : 'current',
      timestamp: latestAction?.created_at || caseData.detected_at,
      description: `Recommended ${aiDecisionName} (Confidence ${(confidence * 100).toFixed(0)}%)`,
      icon: Bot,
    },

    // 4. POLICY CHECK
    {
      id: 'policy_check',
      name: 'POLICY GATE',
      sublabel: 'Deterministic Gate',
      status: isBlocked
        ? 'blocked'
        : hasPolicyDecision || isRecovered
        ? 'completed'
        : hasAiDecision
        ? 'current'
        : 'pending',
      timestamp: latestAction?.created_at,
      description: isBlocked
        ? 'Unsafe recommendation blocked by deterministic policy gate'
        : 'Rule validation passed (Max 2 retries, 24h cooldown enforced)',
      icon: isBlocked ? ShieldAlert : ShieldCheck,
    },

    // 5. ACTION
    {
      id: 'action',
      name: 'ACTION',
      sublabel: 'Worker Dispatch',
      status: isBlocked
        ? 'skipped'
        : isFailedAction
        ? 'failed'
        : hasActionExecuted || isRecovered
        ? 'completed'
        : hasPolicyDecision
        ? 'current'
        : 'pending',
      timestamp: latestAction?.executed_at || latestAction?.created_at,
      description: isBlocked
        ? 'Execution halted by policy engine'
        : isFailedAction
        ? 'Gateway timeout detected • Safe retry triggered'
        : latestAction
        ? `Dispatched ${latestAction.action_type.replace(/_/g, ' ')}`
        : 'Awaiting policy clearance',
      icon: Zap,
    },

    // 6. VERIFICATION
    {
      id: 'verification',
      name: 'VERIFY STATE',
      sublabel: 'Gateway Query',
      status: isBlocked
        ? 'skipped'
        : isRecovered
        ? 'completed'
        : caseData.status === 'in_progress'
        ? 'current'
        : 'pending',
      timestamp: caseData.resolved_at || undefined,
      description: isRecovered
        ? 'Razorpay payment capture verified via webhook HMAC'
        : isBlocked
        ? 'Verification skipped'
        : 'Continuous payment polling & webhook listener active',
      icon: CheckCircle2,
    },

    // 7. RECOVERED / OUTCOME
    {
      id: 'outcome',
      name: isRecovered ? 'RECOVERED' : isBlocked ? 'BLOCKED' : 'RESOLUTION',
      sublabel: isRecovered ? 'Verified Settlement' : 'Final State',
      status: isRecovered
        ? 'completed'
        : isBlocked
        ? 'blocked'
        : caseData.status === 'in_progress'
        ? 'current'
        : 'pending',
      timestamp: caseData.resolved_at || undefined,
      description: isRecovered
        ? `${formatINR(Number(caseData.recovered_amount || caseData.amount_at_risk))} successfully retained`
        : isBlocked
        ? 'Zero money lost to unapproved actions'
        : 'Recovery cycle in progress',
      icon: isRecovered ? Award : isBlocked ? XCircle : Clock,
    },
  ];

  return (
    <div className={cn('rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] p-5 space-y-5', className)}>
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(242,237,227,0.08)]">
        <div>
          <h3 className="text-xs font-mono font-medium text-[#817A70] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#B89A62]" />
            Signature Recovery Lifecycle Protocol
          </h3>
          <p className="text-xs text-[#B7B0A3] mt-0.5">
            Deterministic 7-stage state machine from failure detection to verified settlement
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRecovered ? (
            <Badge variant="emerald" className="py-1 px-2.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> RECOVERY VERIFIED
            </Badge>
          ) : isBlocked ? (
            <Badge variant="rose" className="py-1 px-2.5 text-xs">
              <ShieldAlert className="w-3.5 h-3.5" /> POLICY BLOCKED
            </Badge>
          ) : (
            <Badge variant="gold" className="py-1 px-2.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> IN PROGRESS
            </Badge>
          )}
        </div>
      </div>

      {/* Horizontal Lifecycle Visualization (Desktop & Tablet) */}
      <div className="hidden lg:grid grid-cols-7 gap-2 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === steps.length - 1;

          const isDone = step.status === 'completed';
          const isCurr = step.status === 'current';
          const isBlock = step.status === 'blocked';
          const isFail = step.status === 'failed';

          return (
            <div key={step.id} className="relative flex flex-col items-start space-y-2 group">
              {/* Top Connector Line */}
              {!isLast && (
                <div className="absolute left-[20px] top-[14px] right-[-14px] h-[2px] z-0 pointer-events-none">
                  <div
                    className={cn(
                      'h-full transition-all duration-300',
                      isDone
                        ? 'bg-[#6F9B7A]'
                        : isBlock
                        ? 'bg-[#B56F68]'
                        : isCurr
                        ? 'bg-[#B89A62]/40'
                        : 'bg-[rgba(242,237,227,0.08)]'
                    )}
                  />
                </div>
              )}

              {/* Step Node Indicator */}
              <div
                className={cn(
                  'w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-medium z-10 transition-all duration-200',
                  isDone && 'bg-[#6F9B7A] text-[#151513]',
                  isCurr && 'bg-[#1C1B18] border-2 border-[#B89A62] text-[#D1B982]',
                  isBlock && 'bg-[#B56F68] text-[#151513]',
                  isFail && 'bg-[#B68B4F] text-[#151513]',
                  step.status === 'pending' && 'bg-[#24221E] border border-[rgba(242,237,227,0.08)] text-[#817A70]',
                  step.status === 'skipped' && 'bg-[#181714] border border-[rgba(242,237,227,0.06)] text-[#817A70]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Step Meta Info */}
              <div className="space-y-0.5 pr-2">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      'font-mono text-[11px] font-semibold tracking-tight',
                      isDone && 'text-[#F2EDE3]',
                      isCurr && 'text-[#D1B982]',
                      isBlock && 'text-[#B56F68]',
                      isFail && 'text-[#B68B4F]',
                      (step.status === 'pending' || step.status === 'skipped') && 'text-[#817A70]'
                    )}
                  >
                    {step.name}
                  </span>
                </div>

                <p className="text-[10px] font-mono text-[#817A70]">{step.sublabel}</p>

                <p
                  className={cn(
                    'text-[10px] leading-tight pt-1',
                    isDone || isCurr ? 'text-[#B7B0A3]' : 'text-[#817A70]'
                  )}
                >
                  {step.description}
                </p>

                {step.timestamp && (
                  <p className="text-[9px] font-mono text-[#817A70] pt-0.5">
                    {formatDate(step.timestamp)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vertical Lifecycle Visualization (Mobile & Small screens) */}
      <div className="lg:hidden relative pl-6 border-l border-[rgba(242,237,227,0.10)] space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = step.status === 'completed';
          const isCurr = step.status === 'current';
          const isBlock = step.status === 'blocked';
          const isFail = step.status === 'failed';

          return (
            <div key={step.id} className="relative space-y-1">
              {/* Node Dot */}
              <div
                className={cn(
                  'absolute -left-[31px] top-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px]',
                  isDone && 'bg-[#6F9B7A] text-[#151513]',
                  isCurr && 'bg-[#1C1B18] border border-[#B89A62] text-[#D1B982]',
                  isBlock && 'bg-[#B56F68] text-[#151513]',
                  isFail && 'bg-[#B68B4F] text-[#151513]',
                  (step.status === 'pending' || step.status === 'skipped') &&
                    'bg-[#24221E] border border-[rgba(242,237,227,0.08)] text-[#817A70]'
                )}
              >
                <Icon className="w-3 h-3" />
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'font-mono text-xs font-semibold',
                    isDone && 'text-[#F2EDE3]',
                    isCurr && 'text-[#D1B982]',
                    isBlock && 'text-[#B56F68]',
                    (step.status === 'pending' || step.status === 'skipped') && 'text-[#817A70]'
                  )}
                >
                  {step.name}
                </span>
                {step.timestamp && (
                  <span className="text-[10px] font-mono text-[#817A70]">
                    {formatDate(step.timestamp)}
                  </span>
                )}
              </div>

              <p className="text-xs text-[#B7B0A3]">{step.description}</p>
            </div>
          );
        })}
      </div>

      {/* Narrative Callout Banners for Signature States */}
      {isRecovered && (
        <div className="p-3.5 rounded-lg bg-[#6F9B7A]/10 border border-[#6F9B7A]/30 flex items-start gap-3 text-xs motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#6F9B7A] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-[#F2EDE3]">
              Confirmed Settlement: {formatINR(Number(caseData.recovered_amount || caseData.amount_at_risk))} Retained
            </div>
            <p className="text-[11px] text-[#B7B0A3] font-mono">
              Razorpay webhook received with cryptographic HMAC-SHA256 signature verification. State transition to RECOVERED is immutable.
            </p>
          </div>
        </div>
      )}

      {isBlocked && (
        <div className="p-3.5 rounded-lg bg-[#B56F68]/10 border border-[#B56F68]/30 flex items-start gap-3 text-xs motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <ShieldAlert className="w-4 h-4 text-[#B56F68] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-[#F2EDE3]">
              Safety Policy Intervention: Unsafe Action Refused
            </div>
            <p className="text-[11px] text-[#B7B0A3]">
              The AI recommended an action that violated deterministic safety boundaries (e.g. exceeded retry limits or broken cooldown). The Policy Engine intercepted and blocked execution.
            </p>
          </div>
        </div>
      )}

      {isFailedAction && (
        <div className="p-3.5 rounded-lg bg-[#B68B4F]/10 border border-[#B68B4F]/30 flex items-start gap-3 text-xs motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <RefreshCw className="w-4 h-4 text-[#B68B4F] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-[#F2EDE3]">
              Gateway Uncertainty Detected: Safe Retry Armed
            </div>
            <p className="text-[11px] text-[#B7B0A3]">
              Razorpay API timed out during execution. The system safely queried transaction status before initiating a controlled idempotent retry without double-billing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
