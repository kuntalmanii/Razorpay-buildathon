import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to Load Data',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl bg-rose-500/5 border border-rose-500/20',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 mb-3 border border-rose-500/20">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-rose-300">{title}</h4>
      <p className="text-xs text-rose-200/80 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
          onClick={onRetry}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry Request
        </Button>
      )}
    </div>
  );
}
