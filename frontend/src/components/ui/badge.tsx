import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'blue' | 'emerald' | 'rose' | 'purple' | 'neutral';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-[#24221E] text-[#B7B0A3] border-[rgba(242,237,227,0.10)]',
    gold: 'bg-[#B89A62]/10 text-[#D1B982] border-[#B89A62]/25',
    blue: 'bg-[#71879A]/10 text-[#71879A] border-[#71879A]/25',
    emerald: 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/25',
    rose: 'bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/25',
    purple: 'bg-[#817A70]/15 text-[#B7B0A3] border-[#817A70]/25',
    neutral: 'bg-[#1C1B18] text-[#817A70] border-[rgba(242,237,227,0.08)]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
