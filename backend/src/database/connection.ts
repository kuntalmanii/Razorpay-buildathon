/**
 * database/connection.ts — PostgreSQL Pool singleton with Dev-Memory fallback.
 *
 * Exports a single `pool` instance shared across the entire application.
 * In development, if PostgreSQL is not running on localhost, seamlessly falls back
 * to an in-memory SQL mock with realistic seed data to keep all services operational.
 */

import { Pool, PoolClient } from 'pg';
import { buildPoolConfig } from '../config/database';
import { logger } from '../utils/logger';
import { devMemoryStore } from './devMemoryStore';

// ─── Singleton Pool ───────────────────────────────────────────────────────────
let pool: Pool | null = null;
let useDevFallback = false;

function createDevFallbackPool(): Pool {
  const fallback = {
    query: async (sql: string, params: unknown[] = []) => {
      const res = devMemoryStore.query(sql, params);
      return res;
    },
    connect: async () => ({
      query: async (sql: string, params: unknown[] = []) => devMemoryStore.query(sql, params),
      release: () => {},
    }),
    totalCount: 1,
    idleCount: 1,
    waitingCount: 0,
    on: () => {},
    end: async () => {},
  };
  return fallback as unknown as Pool;
}

export function getPool(): Pool {
  if (useDevFallback) {
    if (!pool) {
      pool = createDevFallbackPool();
    }
    return pool;
  }

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

/**
 * Allows overriding or resetting the pool instance (useful for unit tests).
 */
export function setPool(customPool: Pool | null): void {
  pool = customPool;
  useDevFallback = false;
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
  isFallback?: boolean;
}

export async function testConnection(): Promise<DatabaseHealth> {
  const start = Date.now();

  // If already in fallback mode
  if (useDevFallback) {
    return {
      status: 'ok',
      latency_ms: 1,
      pool: { total: 1, idle: 1, waiting: 0 },
      isFallback: true,
    };
  }

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

    // In development mode, automatically switch to dev memory fallback so app stays healthy
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Switching to high-fidelity In-Memory Development Store (Postgres unavailable)');
      useDevFallback = true;
      pool = createDevFallbackPool();

      return {
        status: 'ok',
        latency_ms: 1,
        pool: { total: 1, idle: 1, waiting: 0 },
        isFallback: true,
      };
    }

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
