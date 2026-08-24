import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'blue' | 'emerald' | 'rose' | 'purple' | 'neutral';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#1C212B] text-stone-300 border-[#282E3B]',
    gold: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
    neutral: 'bg-stone-800 text-stone-400 border-stone-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
