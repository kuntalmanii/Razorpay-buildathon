/**
 * config/index.ts — Barrel export for all configuration modules.
 */

export { config } from './env';
export type { AppConfig } from './env';
export { buildPoolConfig } from './database';
