/**
 * database.ts — PostgreSQL Pool configuration derived from validated env config.
 *
 * Exports a PoolConfig object ready to be passed directly to `new Pool()`.
 * Centralised here so connection behaviour (timeouts, pool size) can be tuned
 * in one place.
 */

import { PoolConfig } from 'pg';
import { config } from './env';

export function buildPoolConfig(): PoolConfig {
  return {
    connectionString: config.database.url,
    min: config.database.poolMin,
    max: config.database.poolMax,
    connectionTimeoutMillis: config.database.connectionTimeoutMs,
    idleTimeoutMillis: config.database.idleTimeoutMs,
    // Always return timestamps as JavaScript Date objects
    // (not strings) regardless of pg.types settings elsewhere
    allowExitOnIdle: false,
  };
}
