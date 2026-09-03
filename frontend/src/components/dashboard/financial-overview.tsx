'use client';

import { formatINR } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, TrendingUp, Layers, CheckCircle } from 'lucide-react';
import { MetricTooltip } from '@/components/ui/tooltip';

interface FinancialOverviewProps {
  totalRevenueAtRiskPaise: number;
  totalRecoveredPaise: number;
  recoveryRatePercent: number;
  openCasesCount: number;
  inProgressCasesCount: number;
  recoveredCasesCount: number;
  totalCasesCount: number;
}

export function FinancialOverview({
  totalRevenueAtRiskPaise,
  totalRecoveredPaise,
  recoveryRatePercent,
  openCasesCount,
  inProgressCasesCount,
  recoveredCasesCount,
  totalCasesCount,
}: FinancialOverviewProps) {
  const activeCasesCount = openCasesCount + inProgressCasesCount;

  // Empty state if entirely zero activity
  if (totalCasesCount === 0 && totalRevenueAtRiskPaise === 0 && totalRecoveredPaise === 0) {
    return (
      <div className="p-8 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-[#6F9B7A]/15 border border-[#6F9B7A]/30 flex items-center justify-center mx-auto text-[#6F9B7A]">
          <CheckCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-[#F2EDE3]">No revenue currently at risk</h3>
        <p className="text-xs text-[#817A70] max-w-md mx-auto">
          All gateway payment flows are executing normally. If any transactions fail, RecoverIQ will automatically detect them and initiate autonomous recovery.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Revenue At Risk */}
      <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#B56F68]/40 transition-colors">
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
            Revenue at Risk
            <MetricTooltip content="Total unresolved exposure across all open and in-progress payment failures." />
          </h2>
          <div className="bg-[#B56F68]/15 text-[#B56F68] border border-[#B56F68]/25 p-1.5 rounded-md flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="font-mono text-2xl sm:text-3xl text-[#F2EDE3] font-bold tracking-tight">
            {formatINR(totalRevenueAtRiskPaise)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
            <span className="text-[#817A70]">Unresolved exposure</span>
            <span className="font-mono text-[11px] font-semibold text-[#B56F68] bg-[#B56F68]/10 px-2 py-0.5 rounded border border-[#B56F68]/20">
              {activeCasesCount} active
            </span>
          </div>
        </div>
      </div>

      {/* 2. Revenue Recovered */}
      <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#6F9B7A]/40 transition-colors">
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
            Revenue Recovered
            <MetricTooltip content="Total verified settlements captured through automated recovery." />
          </h2>
          <div className="bg-[#6F9B7A]/15 text-[#6F9B7A] border border-[#6F9B7A]/25 p-1.5 rounded-md flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="font-mono text-2xl sm:text-3xl text-[#F2EDE3] font-bold tracking-tight">
            {formatINR(totalRecoveredPaise)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
            <span className="text-[#817A70]">Verified settlements</span>
            <span className="font-mono text-[11px] font-semibold text-[#6F9B7A] bg-[#6F9B7A]/10 px-2 py-0.5 rounded border border-[#6F9B7A]/20">
              {recoveredCasesCount} saved
            </span>
          </div>
        </div>
      </div>

      {/* 3. Recovery Rate */}
      <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#B89A62]/40 transition-colors">
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
            Recovery Rate
            <MetricTooltip content="Percentage of identified exposed revenue successfully recovered." />
          </h2>
          <div className="bg-[#B89A62]/15 text-[#D1B982] border border-[#B89A62]/25 p-1.5 rounded-md flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="font-mono text-2xl sm:text-3xl text-[#F2EDE3] font-bold tracking-tight">
            {recoveryRatePercent.toFixed(1)}%
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
            <span className="text-[#817A70]">Success velocity</span>
            <span className="font-mono text-[11px] font-medium text-[#B7B0A3] bg-[#24221E] px-2 py-0.5 rounded">
              {recoveredCasesCount} of {totalCasesCount} cases
            </span>
          </div>
        </div>
      </div>

      {/* 4. Active Recovery Cases */}
      <div className="bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[rgba(242,237,227,0.25)] transition-colors">
        <div className="flex justify-between items-start">
          <h2 className="font-mono text-xs text-[#817A70] uppercase tracking-wider flex items-center gap-1">
            Active Cases
            <MetricTooltip content="Cases currently undergoing automated recovery or awaiting operator action." />
          </h2>
          <div className="bg-[#24221E] text-[#B7B0A3] border border-[rgba(242,237,227,0.12)] p-1.5 rounded-md flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-4">
          <div className="font-mono text-2xl sm:text-3xl text-[#F2EDE3] font-bold tracking-tight">
            {activeCasesCount}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(242,237,227,0.06)] text-xs">
            <span className="text-[#817A70]">Cases in flight</span>
            <span className="font-mono text-[11px] text-[#817A70]">
              <strong className="text-[#F2EDE3]">{openCasesCount}</strong> open &bull;{' '}
              <strong className="text-[#D1B982]">{inProgressCasesCount}</strong> active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
