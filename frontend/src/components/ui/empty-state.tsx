import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-xl bg-[#13161C]/50 border border-dashed border-[#232733]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#1F242E] flex items-center justify-center text-stone-400 mb-4 border border-[#2B3240]">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-medium text-stone-200">{title}</h4>
      <p className="text-sm text-stone-400 mt-1 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
