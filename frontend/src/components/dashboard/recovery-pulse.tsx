'use client';

import React from 'react';
import { RecoveryCase, RecoveryAction } from '@/types/api';
import {
  Search,
  Stethoscope,
  ShieldCheck,
  Bot,
  CheckCircle2,
  Send,
  BadgeCheck,
  Sparkles,
} from 'lucide-react';

interface RecoveryPulseProps {
  cases: RecoveryCase[];
  actions: RecoveryAction[];
  selectedStage?: string | null;
  onSelectStage?: (stage: string | null) => void;
}

interface PulseStage {
  id: string;
  name: string;
  description: string;
  count: number;
  icon: React.ElementType;
  activeColor: string;
  bgLight: string;
}

export function RecoveryPulse({
  cases,
  actions,
  selectedStage,
  onSelectStage,
}: RecoveryPulseProps) {
  // 1. Detected: Total cases logged in the system
  const detectedCount = cases.length;

  // 2. Diagnosed: Cases with identified failure categories
  const diagnosedCount = cases.filter(
    (c) => c.failure_category && c.failure_category.length > 0
  ).length;

  // 3. Risk Checked: Cases with risk_score assessed
  const riskCheckedCount = cases.filter(
    (c) => c.risk_score !== null && c.risk_score !== undefined
  ).length;

  // 4. Recommended: Actions proposed by AI or rules
  const recommendedCount = actions.filter(
    (a) => a.proposed_by === 'ai' || a.proposed_by === 'rule'
  ).length;

  // 5. Policy Approved: Actions approved by the policy engine
  const policyApprovedCount = actions.filter(
    (a) => a.policy_status === 'approved'
  ).length;

  // 6. Actioned: Actions scheduled or executing or completed
  const actionedCount = actions.filter(
    (a) => ['scheduled', 'executing', 'completed'].includes(a.execution_status)
  ).length;

  // 7. Verified: Completed actions verified by telemetry
  const verifiedCount = actions.filter(
    (a) => a.execution_status === 'completed'
  ).length;

  // 8. Recovered: Cases with status = 'recovered'
  const recoveredCount = cases.filter((c) => c.status === 'recovered').length;

  const stages: PulseStage[] = [
    {
      id: 'detected',
      name: 'Detected',
      description: 'Webhook failure ingested',
      count: detectedCount,
      icon: Search,
      activeColor: '#B7B0A3',
      bgLight: 'bg-[#B7B0A3]/10 text-[#B7B0A3]',
    },
    {
      id: 'diagnosed',
      name: 'Diagnosed',
      description: 'Error code categorized',
      count: diagnosedCount,
      icon: Stethoscope,
      activeColor: '#71879A',
      bgLight: 'bg-[#71879A]/10 text-[#71879A]',
    },
    {
      id: 'risk_checked',
      name: 'Risk Checked',
      description: 'Customer history scored',
      count: riskCheckedCount,
      icon: ShieldCheck,
      activeColor: '#B68B4F',
      bgLight: 'bg-[#B68B4F]/10 text-[#D1B982]',
    },
    {
      id: 'recommended',
      name: 'Recommended',
      description: 'AI strategy formulated',
      count: recommendedCount,
      icon: Bot,
      activeColor: '#B89A62',
      bgLight: 'bg-[#B89A62]/10 text-[#D1B982]',
    },
    {
      id: 'policy_approved',
      name: 'Policy Approved',
      description: 'Deterministic gates passed',
      count: policyApprovedCount,
      icon: CheckCircle2,
      activeColor: '#6F9B7A',
      bgLight: 'bg-[#6F9B7A]/10 text-[#6F9B7A]',
    },
    {
      id: 'actioned',
      name: 'Actioned',
      description: 'Links / retries dispatched',
      count: actionedCount,
      icon: Send,
      activeColor: '#D1B982',
      bgLight: 'bg-[#D1B982]/10 text-[#D1B982]',
    },
    {
      id: 'verified',
      name: 'Verified',
      description: 'Gateway confirmation received',
      count: verifiedCount,
      icon: BadgeCheck,
      activeColor: '#6F9B7A',
      bgLight: 'bg-[#6F9B7A]/10 text-[#6F9B7A]',
    },
    {
      id: 'recovered',
      name: 'Recovered',
      description: 'Revenue saved & settled',
      count: recoveredCount,
      icon: Sparkles,
      activeColor: '#6F9B7A',
      bgLight: 'bg-[#6F9B7A]/15 text-[#6F9B7A]',
    },
  ];

  return (
    <div className="p-5 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#F2EDE3] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B89A62]" />
            Recovery Pulse
          </h2>
          <p className="text-xs text-[#817A70] mt-0.5">
            End-to-end lifecycle progression of payment failure events through the RecoverIQ pipeline
          </p>
        </div>

        {selectedStage && (
          <button
            onClick={() => onSelectStage?.(null)}
            className="text-[11px] font-mono text-[#D1B982] hover:text-[#F2EDE3] transition-colors self-start sm:self-auto"
          >
            Clear stage filter &times;
          </button>
        )}
      </div>

      {/* Horizontal Lifecycle Pipeline */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin">
        <div className="flex items-center min-w-[780px] justify-between gap-1 relative">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isSelected = selectedStage === stage.id;
            const hasData = stage.count > 0;
            const isLast = idx === stages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Stage Item */}
                <button
                  type="button"
                  onClick={() =>
                    onSelectStage?.(isSelected ? null : stage.id)
                  }
                  className={`flex-1 min-w-[88px] p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-[#24221E] border-[#B89A62] shadow-sm'
                      : hasData
                      ? 'bg-[#151513]/60 border-[rgba(242,237,227,0.08)] hover:border-[rgba(242,237,227,0.20)] hover:bg-[#24221E]/50'
                      : 'bg-[#151513]/30 border-[rgba(242,237,227,0.04)] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-[10px] text-[#817A70]">
                      0{idx + 1}
                    </span>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center ${stage.bgLight}`}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>

                  <div className="font-mono text-base font-bold text-[#F2EDE3] tracking-tight">
                    {stage.count}
                  </div>

                  <div className="text-[11px] font-semibold text-[#B7B0A3] truncate mt-0.5">
                    {stage.name}
                  </div>

                  <div className="text-[9px] text-[#817A70] truncate leading-tight">
                    {stage.description}
                  </div>
                </button>

                {/* Connector Arrow */}
                {!isLast && (
                  <div className="shrink-0 text-[#817A70]/40 px-0.5 text-xs font-mono select-none">
                    &rarr;
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
