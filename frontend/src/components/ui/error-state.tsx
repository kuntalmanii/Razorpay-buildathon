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
  title = 'Unable to Load Data',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg bg-[#B56F68]/5 border border-[#B56F68]/20',
        className
      )}
    >
      <div className="w-9 h-9 rounded-full bg-[#B56F68]/10 flex items-center justify-center text-[#B56F68] mb-3 border border-[#B56F68]/20">
        <AlertCircle className="w-4 h-4" />
      </div>
      <h4 className="text-xs sm:text-sm font-semibold text-[#F2EDE3]">{title}</h4>
      <p className="text-xs text-[#B7B0A3] mt-1 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-[#B56F68]/30 text-[#F2EDE3] hover:bg-[#B56F68]/10"
          onClick={onRetry}
        >
          <RefreshCw className="w-3 h-3 mr-1.5" />
          Retry Request
        </Button>
      )}
    </div>
  );
}
