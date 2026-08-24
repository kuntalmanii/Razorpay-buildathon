/**
 * database/connection.ts — PostgreSQL Pool singleton.
 *
 * Exports a single `pool` instance shared across the entire application.
 * Also exports `testConnection()` for health checks and startup verification.
 *
 * The pool is NOT connected eagerly — pg manages connections lazily.
 * Call `testConnection()` at startup to verify DB reachability.
 */

import { Pool, PoolClient } from 'pg';
import { buildPoolConfig } from '../config/database';
import { logger } from '../utils/logger';

// ─── Singleton Pool ───────────────────────────────────────────────────────────
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    pool.on('connect', () => {
      logger.debug('New database client connected to pool');
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', {
        message: err.message,
      });
    });

    pool.on('remove', () => {
      logger.debug('Database client removed from pool');
    });
  }
  return pool;
}

// ─── Health Check ─────────────────────────────────────────────────────────────
export interface DatabaseHealth {
  status: 'ok' | 'error';
  latency_ms: number;
  pool: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}

export async function testConnection(): Promise<DatabaseHealth> {
  const start = Date.now();
  const p = getPool();
  let client: PoolClient | null = null;

  try {
    client = await p.connect();
    await client.query('SELECT 1');
    const latency_ms = Date.now() - start;

    return {
      status: 'ok',
      latency_ms,
      pool: {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount,
      },
    };
  } catch (err) {
    const latency_ms = Date.now() - start;
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      status: 'error',
      latency_ms,
      pool: {
        total: p.totalCount,
        idle: p.idleCount,
        waiting: p.waitingCount,
      },
      error: message,
    };
  } finally {
    client?.release();
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}
