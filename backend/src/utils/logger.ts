/**
 * utils/logger.ts — Structured, levelled console logger.
 *
 * No external logging library — keeps dependencies minimal for Phase 1.
 * Outputs JSON lines in production for log aggregator compatibility.
 * Outputs human-readable coloured text in development.
 */

import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const configuredLevel = (config.log.level as LogLevel) ?? 'info';
  return LOG_LEVELS[level] >= (LOG_LEVELS[configuredLevel] ?? 1);
}

interface LogMeta {
  [key: string]: unknown;
}

function formatDev(level: LogLevel, message: string, meta?: LogMeta): string {
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // cyan
    info: '\x1b[32m',  // green
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  };
  const reset = '\x1b[0m';
  const timestamp = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0
    ? ` ${JSON.stringify(meta)}`
    : '';
  return `${colors[level]}[${level.toUpperCase()}]${reset} ${timestamp} ${message}${metaStr}`;
}

function formatProd(level: LogLevel, message: string, meta?: LogMeta): string {
  return JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'recoveriq-backend',
    ...meta,
  });
}

function log(level: LogLevel, message: string, meta?: LogMeta): void {
  if (!shouldLog(level)) return;

  const output = config.server.isProduction
    ? formatProd(level, message, meta)
    : formatDev(level, message, meta);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log('debug', message, meta),
  info: (message: string, meta?: LogMeta) => log('info', message, meta),
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta),
  error: (message: string, meta?: LogMeta) => log('error', message, meta),
};
