import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      'bg-amber-500 hover:bg-amber-400 text-stone-950 font-medium shadow-sm hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    secondary:
      'bg-[#1F242E] hover:bg-[#282E3B] text-stone-200 border border-[#2B3240]',
    outline:
      'border border-[#282E3B] hover:border-amber-500/40 hover:bg-amber-500/5 text-stone-300',
    ghost:
      'hover:bg-[#1A1E26] text-stone-400 hover:text-stone-200',
    danger:
      'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
