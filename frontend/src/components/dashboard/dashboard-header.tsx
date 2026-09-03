'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  RefreshCw,
  Plus,
  Clock,
  ExternalLink,
  Info,
} from 'lucide-react';

interface DashboardHeaderProps {
  activeCasesCount: number;
  totalAtRiskPaise: number;
  onRefresh: () => void;
  onAddCase: () => void;
  refreshing: boolean;
}

export function DashboardHeader({
  activeCasesCount,
  onRefresh,
  onAddCase,
  refreshing,
}: DashboardHeaderProps) {
  const { user, isAdmin } = useAuth();
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST'
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const displayName = user?.name || 'Operator';

  return (
    <div className="space-y-3">
      {/* Admin Role Awareness Banner */}
      {isAdmin && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#B89A62]/10 border border-[#B89A62]/30 text-xs text-[#D1B982]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#B89A62]" />
            <span>
              <strong>Admin Notice:</strong> You are viewing the merchant recovery console. System administration, governance, and user management are in the Admin Console.
            </span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1 font-mono font-semibold text-[#F2EDE3] hover:text-[#D1B982] transition-colors shrink-0 underline decoration-[#B89A62]/50"
          >
            Switch to Admin <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#F2EDE3] tracking-tight">
              Welcome back, {displayName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#6F9B7A]/15 text-[#6F9B7A] border border-[#6F9B7A]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6F9B7A] animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-[#817A70]">
            <p>
              Autonomous recovery active &bull;{' '}
              <span className="text-[#F2EDE3] font-medium">
                {activeCasesCount} {activeCasesCount === 1 ? 'case' : 'cases'} in flight
              </span>{' '}
              &bull; Zero double-billing guardrails engaged
            </p>
            {timeString && (
              <span className="font-mono text-[11px] text-[#B7B0A3] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#817A70]" />
                {timeString}
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            className="h-8 px-3 text-xs gap-1.5 border-[rgba(242,237,227,0.12)] hover:bg-[#24221E] text-[#B7B0A3] hover:text-[#F2EDE3]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#B89A62]' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onAddCase}
            className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            Add Case
          </Button>
        </div>
      </div>
    </div>
  );
}
