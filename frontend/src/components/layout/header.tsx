'use client';

import React, { useEffect, useState } from 'react';
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
    <header className="h-16 border-b border-[#1E232E] bg-[#0F1117]/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-semibold text-stone-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-stone-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13161C] border border-[#232733]">
          <Activity
            className={`w-3.5 h-3.5 ${
              backendOnline === true
                ? 'text-emerald-400'
                : backendOnline === false
                ? 'text-rose-400'
                : 'text-amber-400 animate-spin'
            }`}
          />
          <span className="text-xs font-mono text-stone-300">
            {backendOnline === true
              ? 'Backend Online'
              : backendOnline === false
              ? 'Backend Unreachable'
              : 'Connecting...'}
          </span>
        </div>

        <Badge variant="gold" className="gap-1.5 py-1">
          <Zap className="w-3 h-3 fill-amber-400" />
          Razorpay Buildathon
        </Badge>
        <Badge variant="emerald" className="gap-1.5 py-1">
          <ShieldCheck className="w-3 h-3" />
          Deterministic Safety
        </Badge>
      </div>
    </header>
  );
}
