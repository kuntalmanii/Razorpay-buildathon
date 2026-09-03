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
        'flex flex-col items-center justify-center p-10 sm:p-12 text-center rounded-lg bg-[#1C1B18]/40 border border-dashed border-[rgba(242,237,227,0.12)]',
        className
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-[#24221E] flex items-center justify-center text-[#817A70] mb-3.5 border border-[rgba(242,237,227,0.08)]">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-medium text-[#F2EDE3]">{title}</h4>
      <p className="text-xs text-[#B7B0A3] mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
