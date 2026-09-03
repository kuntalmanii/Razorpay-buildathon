'use client';

import { Fragment } from 'react';
import { RecoveryCase, RecoveryAction, AuditLog } from '@/types/api';
import { formatINR } from '@/lib/utils';
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
  Award,
  Lock,
  Stethoscope,
} from 'lucide-react';
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
  const payload = (latestAction?.payload || {}) as Record<string, unknown>;

  const isRecovered = caseData.status === 'recovered';
  const isBlocked = latestAction?.policy_status === 'rejected' || caseData.status === 'escalated';
  const isFailedAction = latestAction?.execution_status === 'failed' || caseData.status === 'unrecoverable';
  const hasAiDecision = Boolean(latestAction || auditLogs.some((l) => l.actor_type === 'ai'));
  const hasPolicyDecision = Boolean(latestAction?.policy_status || isRecovered);
  const hasActionExecuted = Boolean(
    latestAction?.execution_status === 'completed' || isRecovered
  );

  const aiDecisionName =
    (payload.decision as string) ||
    latestAction?.action_type.replace(/_/g, ' ').toUpperCase() ||
    (caseData.failure_category.includes('insufficient') ? 'PAYMENT LINK' : 'SCHEDULE RETRY');

  const confidence =
    typeof payload.confidence === 'number'
      ? payload.confidence
      : Number(caseData.recovery_probability || 0.75);

  const failureReason =
    latestAction?.failure_reason ||
    (payload.failure_reason as string) ||
    (payload.error as string);

  // Exact 8-Stage Lifecycle:
  // 1. DETECTED → 2. DIAGNOSED → 3. RISK CHECKED → 4. AI RECOMMENDED →
  // 5. POLICY CHECK → 6. ACTION → 7. VERIFICATION → 8. RECOVERED / FAILED / BLOCKED
  const steps: FlowStep[] = [
    // 1. DETECTED
    {
      id: 'detected',
      name: 'DETECTED',
      sublabel: 'Ingress Telemetry',
      status: 'completed',
      timestamp: caseData.detected_at,
      description: `Razorpay webhook received (${caseData.failure_category.replace(/_/g, ' ')})`,
      icon: AlertTriangle,
    },

    // 2. DIAGNOSED
    {
      id: 'diagnosed',
      name: 'DIAGNOSED',
      sublabel: 'Error Classification',
      status: 'completed',
      timestamp: caseData.detected_at,
      description: `Deterministic category: ${caseData.failure_category.replace(/_/g, ' ').toUpperCase()}`,
      icon: Stethoscope,
    },

    // 3. RISK CHECKED
    {
      id: 'risk_checked',
      name: 'RISK CHECKED',
      sublabel: 'Customer Scoring',
      status: 'completed',
      timestamp: caseData.detected_at,
      description: `Risk: ${caseData.risk_score}/100 • Recovery Prob: ${(Number(caseData.recovery_probability) * 100).toFixed(0)}%`,
      icon: Activity,
    },

    // 4. AI RECOMMENDED
    {
      id: 'ai_recommended',
      name: 'AI RECOMMENDED',
      sublabel: 'Advisory Proposal',
      status: hasAiDecision || hasPolicyDecision || isRecovered ? 'completed' : 'current',
      timestamp: latestAction?.created_at || caseData.detected_at,
      description: `Recommended ${aiDecisionName} (Confidence ${(confidence * 100).toFixed(0)}%)`,
      icon: Bot,
    },

    // 5. POLICY CHECK
    {
      id: 'policy_check',
      name: 'POLICY CHECK',
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
        ? 'Action halted by deterministic policy safety gate'
        : 'Policy check passed (24h cooldown, max 2 retries, idempotency enforced)',
      icon: isBlocked ? ShieldAlert : ShieldCheck,
    },

    // 6. ACTION
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
        ? 'Dispatch cancelled by policy safety gate'
        : isFailedAction
        ? `Attempt failed: ${failureReason || 'Gateway failure during execution'}`
        : latestAction
        ? `Dispatched ${latestAction.action_type.replace(/_/g, ' ').toUpperCase()}`
        : 'Awaiting policy clearance',
      icon: isFailedAction ? XCircle : Zap,
    },

    // 7. VERIFICATION
    {
      id: 'verification',
      name: 'VERIFICATION',
      sublabel: 'Gateway Settlement',
      status: isBlocked || isFailedAction
        ? 'skipped'
        : isRecovered
        ? 'completed'
        : caseData.status === 'in_progress'
        ? 'current'
        : 'pending',
      timestamp: caseData.resolved_at || undefined,
      description: isRecovered
        ? 'Payment capture verified via Razorpay webhook HMAC signature'
        : isBlocked || isFailedAction
        ? 'Verification skipped due to previous stage outcome'
        : 'Awaiting webhook capture verification from gateway',
      icon: CheckCircle2,
    },

    // 8. RECOVERED / FAILED / BLOCKED / IN PROGRESS
    // NEVER show "Recovered" until recovery is actually verified (caseData.status === 'recovered')
    {
      id: 'outcome',
      name: isRecovered
        ? 'RECOVERED'
        : isBlocked
        ? 'BLOCKED'
        : isFailedAction
        ? 'FAILED'
        : 'IN PROGRESS',
      sublabel: isRecovered
        ? 'Verified Settlement'
        : isBlocked
        ? 'Policy Halted'
        : isFailedAction
        ? 'Recovery Failed'
        : 'Resolution In Flight',
      status: isRecovered
        ? 'completed'
        : isBlocked
        ? 'blocked'
        : isFailedAction
        ? 'failed'
        : 'current',
      timestamp: caseData.resolved_at || undefined,
      description: isRecovered
        ? `${formatINR(Number(caseData.recovered_amount || caseData.amount_at_risk))} successfully settled`
        : isBlocked
        ? 'Zero funds lost to unauthorized or unsafe retries'
        : isFailedAction
        ? 'Recovery attempts exhausted without payment capture'
        : 'Autonomous recovery active; awaiting settlement',
      icon: isRecovered ? Award : isBlocked ? XCircle : isFailedAction ? AlertTriangle : Clock,
    },
  ];

  return (
    <div className={cn('rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] p-5 space-y-5', className)}>
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[rgba(242,237,227,0.08)]">
        <div>
          <h3 className="text-xs font-mono font-medium text-[#817A70] uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#B89A62]" />
            8-Stage Recovery Lifecycle Protocol
          </h3>
          <p className="text-xs text-[#B7B0A3] mt-0.5">
            Full audit trail of state transitions from webhook ingress to final verified settlement
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#817A70]">Terminal State:</span>
          {isRecovered ? (
            <span className="font-bold text-[#6F9B7A] bg-[#6F9B7A]/15 border border-[#6F9B7A]/30 px-2.5 py-0.5 rounded text-[11px]">
              VERIFIED RECOVERED
            </span>
          ) : isBlocked ? (
            <span className="font-bold text-[#D1B982] bg-[#B68B4F]/15 border border-[#B89A62]/30 px-2.5 py-0.5 rounded text-[11px]">
              POLICY BLOCKED
            </span>
          ) : isFailedAction ? (
            <span className="font-bold text-[#B56F68] bg-[#B56F68]/15 border border-[#B56F68]/30 px-2.5 py-0.5 rounded text-[11px]">
              RECOVERY FAILED
            </span>
          ) : (
            <span className="font-bold text-[#D1B982] bg-[#B89A62]/10 border border-[#B89A62]/25 px-2.5 py-0.5 rounded text-[11px]">
              IN PROGRESS
            </span>
          )}
        </div>
      </div>

      {/* Horizontal Lifecycle Pipeline */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
        <div className="flex items-start min-w-[820px] justify-between gap-1 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = step.status === 'completed';
            const isCurrent = step.status === 'current';
            const isBlockedStep = step.status === 'blocked';
            const isFailedStep = step.status === 'failed';
            const isSkipped = step.status === 'skipped';
            const isLast = idx === steps.length - 1;

            return (
              <Fragment key={step.id}>
                <div
                  className={`flex-1 min-w-[92px] p-2.5 rounded-lg border flex flex-col justify-between transition-all ${
                    isCompleted
                      ? 'bg-[#151513] border-[#6F9B7A]/30 text-[#F2EDE3]'
                      : isBlockedStep
                      ? 'bg-[#151513] border-[#B68B4F]/40 text-[#D1B982]'
                      : isFailedStep
                      ? 'bg-[#151513] border-[#B56F68]/40 text-[#B56F68]'
                      : isCurrent
                      ? 'bg-[#24221E] border-[#B89A62] text-[#F2EDE3] shadow-sm'
                      : isSkipped
                      ? 'bg-[#151513]/30 border-[rgba(242,237,227,0.04)] opacity-40'
                      : 'bg-[#151513]/40 border-[rgba(242,237,227,0.06)] opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[9px] text-[#817A70]">
                        0{idx + 1}
                      </span>
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          isCompleted
                            ? 'bg-[#6F9B7A]/15 text-[#6F9B7A]'
                            : isBlockedStep
                            ? 'bg-[#B68B4F]/15 text-[#D1B982]'
                            : isFailedStep
                            ? 'bg-[#B56F68]/15 text-[#B56F68]'
                            : isCurrent
                            ? 'bg-[#B89A62]/20 text-[#D1B982]'
                            : 'bg-[#24221E] text-[#817A70]'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="font-mono text-[11px] font-bold tracking-tight truncate">
                      {step.name}
                    </div>

                    <div className="text-[9px] text-[#817A70] font-mono truncate">
                      {step.sublabel}
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-[rgba(242,237,227,0.06)]">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[8px] font-mono uppercase font-semibold ${
                        isCompleted
                          ? 'bg-[#6F9B7A]/10 text-[#6F9B7A]'
                          : isBlockedStep
                          ? 'bg-[#B68B4F]/10 text-[#D1B982]'
                          : isFailedStep
                          ? 'bg-[#B56F68]/10 text-[#B56F68]'
                          : isCurrent
                          ? 'bg-[#B89A62]/15 text-[#D1B982]'
                          : 'text-[#817A70]'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                </div>

                {!isLast && (
                  <div className="shrink-0 text-[#817A70]/40 pt-4 px-0.5 text-xs font-mono select-none">
                    &rarr;
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Safety Policy Guarantee Notice */}
      <div className="p-3 rounded-lg bg-[#151513] border border-[rgba(242,237,227,0.06)] flex items-start gap-2.5 text-xs text-[#817A70] font-mono">
        <Lock className="w-3.5 h-3.5 text-[#B89A62] shrink-0 mt-0.5" />
        <span>
          <strong>Zero Double-Billing Rule:</strong> RecoverIQ enforces strict pre-dispatch payment status validation. If a payment is captured via standard retry, any open payment links are instantly revoked.
        </span>
      </div>
    </div>
  );
}
