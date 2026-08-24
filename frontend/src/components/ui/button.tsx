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
      'bg-[#B89A62] hover:bg-[#D1B982] text-[#151513] font-medium transition-colors shadow-none',
    secondary:
      'bg-[#24221E] hover:bg-[#2C2A25] text-[#F2EDE3] border border-[rgba(242,237,227,0.10)]',
    outline:
      'border border-[rgba(242,237,227,0.12)] hover:border-[#B89A62]/40 hover:bg-[#B89A62]/5 text-[#F2EDE3]',
    ghost:
      'hover:bg-[#24221E] text-[#B7B0A3] hover:text-[#F2EDE3]',
    danger:
      'bg-[#B56F68]/10 hover:bg-[#B56F68]/20 text-[#B56F68] border border-[#B56F68]/20',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
    md: 'text-xs sm:text-sm px-3.5 py-2 rounded-md gap-2',
    lg: 'text-sm px-4.5 py-2.5 rounded-lg gap-2.5',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89A62]',
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
