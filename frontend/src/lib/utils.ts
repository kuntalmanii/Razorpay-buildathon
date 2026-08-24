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
 * Return badge styles and labels for case status.
 */
export function getStatusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'recovered':
      return {
        label: 'Recovered',
        className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      };
    case 'in_progress':
    case 'recovering':
      return {
        label: 'Recovering',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      };
    case 'escalated':
      return {
        label: 'Escalated',
        className: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      };
    case 'unrecoverable':
    case 'failed':
      return {
        label: 'Failed',
        className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      };
    default:
      return {
        label: 'Open Risk',
        className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      };
  }
}
