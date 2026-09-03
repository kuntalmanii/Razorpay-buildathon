'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import { Badge } from '../ui/badge';

export interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getHealth()
      .then(() => {
        if (isMounted) setBackendOnline(true);
      })
      .catch(() => {
        if (isMounted) setBackendOnline(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <header className="h-14 border-b border-[rgba(242,237,227,0.08)] bg-[#151513]/90 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-sm sm:text-base font-semibold text-[#F2EDE3] tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-[#817A70] font-mono">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#1C1B18] border border-[rgba(242,237,227,0.08)]">
          <Activity
            className={`w-3 h-3 ${
              backendOnline === true
                ? 'text-[#6F9B7A]'
                : backendOnline === false
                ? 'text-[#B56F68]'
                : 'text-[#B89A62] animate-spin'
            }`}
          />
          <span className="text-[11px] font-mono text-[#B7B0A3]">
            {backendOnline === true
              ? 'Backend Live'
              : backendOnline === false
              ? 'Disconnected'
              : 'Connecting...'}
          </span>
        </div>

        <Badge variant="gold" className="gap-1 py-0.5">
          <Zap className="w-3 h-3 fill-[#B89A62]" />
          Razorpay Buildathon
        </Badge>
        <Badge variant="emerald" className="gap-1 py-0.5">
          <ShieldCheck className="w-3 h-3" />
          Deterministic Safety
        </Badge>
      </div>
    </header>
  );
}
