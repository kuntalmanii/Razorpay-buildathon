/**
 * styles/tokens.ts
 *
 * Centralized Design System Tokens for RecoverIQ.
 * Warm, quiet, precise, editorial fintech aesthetic.
 */

export const colors = {
  background: '#151513',
  surface: {
    DEFAULT: '#1C1B18',
    elevated: '#24221E',
    muted: '#181714',
    subtle: '#201F1B',
  },
  text: {
    primary: '#F2EDE3',
    secondary: '#B7B0A3',
    muted: '#817A70',
  },
  accent: {
    brass: '#B89A62',
    brassSoft: '#D1B982',
  },
  status: {
    success: '#6F9B7A',
    warning: '#B68B4F',
    danger: '#B56F68',
    info: '#71879A',
  },
  border: {
    subtle: 'rgba(242, 237, 227, 0.10)',
    faint: 'rgba(242, 237, 227, 0.05)',
    strong: 'rgba(242, 237, 227, 0.18)',
    brass: 'rgba(184, 154, 98, 0.30)',
  },
} as const;

export const chartColors = {
  primary: colors.accent.brass,
  secondary: colors.status.info,
  success: colors.status.success,
  warning: colors.status.warning,
  danger: colors.status.danger,
  grid: 'rgba(242, 237, 227, 0.06)',
  tooltipBg: colors.surface.elevated,
  tooltipBorder: colors.border.subtle,
} as const;

export const radii = {
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '10px',
} as const;
