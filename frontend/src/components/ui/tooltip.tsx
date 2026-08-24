'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricTooltipProps {
  content: string;
  className?: string;
}

export function MetricTooltip({ content, className }: MetricTooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        aria-label="Metric calculation information"
        className="text-stone-400 hover:text-stone-200 focus:outline-none transition-colors ml-1 p-0.5 rounded"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 p-2.5 bg-[#181C24] border border-[#2D3342] text-stone-300 text-[11px] leading-tight rounded-lg shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#181C24]" />
        </div>
      )}
    </div>
  );
}
