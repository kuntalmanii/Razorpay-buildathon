import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  interactive?: boolean;
}

export function Card({ className, glow = false, interactive = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] transition-all duration-200 ease-out',
        glow && 'border-[#B89A62]/35 bg-[#1E1D19]',
        interactive && 'hover:border-[rgba(242,237,227,0.18)] hover:bg-[#201F1B] cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4 sm:p-5 border-b border-[rgba(242,237,227,0.08)]', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('font-medium text-sm sm:text-base text-[#F2EDE3] tracking-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-[#B7B0A3] mt-0.5 leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-4 sm:p-5', className)} {...props}>
      {children}
    </div>
  );
}
