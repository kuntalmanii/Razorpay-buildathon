import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format paise into readable INR string (e.g. 250000 -> ₹2,500.00).
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format ISO date string into human friendly date-time.
 */
export function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

/**
 * Return badge styles and labels for case status using RecoverIQ warm editorial tokens.
 */
export function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'recovered':
      return {
        label: 'Recovered',
        className: 'bg-[#6F9B7A]/10 text-[#6F9B7A] border-[#6F9B7A]/25',
      };
    case 'in_progress':
    case 'recovering':
      return {
        label: 'Recovering',
        className: 'bg-[#B68B4F]/10 text-[#B68B4F] border-[#B68B4F]/25',
      };
    case 'escalated':
      return {
        label: 'Escalated',
        className: 'bg-[#817A70]/15 text-[#B7B0A3] border-[#817A70]/25',
      };
    case 'unrecoverable':
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-[#B56F68]/10 text-[#B56F68] border-[#B56F68]/25',
      };
    default:
      return {
        label: 'Open Risk',
        className: 'bg-[#71879A]/10 text-[#71879A] border-[#71879A]/25',
      };
  }
}
