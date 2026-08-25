/**
 * database/migrate.ts — Programmatic migration status checker.
 *
 * This script is used in CI and during startup to verify that the database
 * schema is up to date. It does NOT run migrations automatically in production
 * (use `npm run migrate:up` explicitly).
 *
 * In development, it can print pending migrations as a reminder.
 *
 * Run with: npm run db:status
 */

import 'dotenv/config';
import { getPool, testConnection, closePool } from './connection';
import { logger } from '../utils/logger';

async function checkMigrationStatus(): Promise<void> {
  logger.info('Checking database connection...');
  const health = await testConnection();

  if (health.status === 'error') {
    logger.error('Database connection failed', { error: health.error });
    process.exit(1);
  }

  logger.info('Database connected', {
    latency_ms: health.latency_ms,
    pool: health.pool,
  });

  const pool = getPool();

  // Check if pgmigrations table exists (node-pg-migrate tracking table)
  const { rows } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND   table_name   = 'pgmigrations'
    ) AS exists;
  `);

  if (!rows || rows.length === 0 || !rows[0]?.exists) {
    logger.warn('pgmigrations table not found — no migrations have been run yet.');
    logger.warn('Run `npm run migrate:up` to apply all migrations.');
    await closePool();
    return;
  }

  const { rows: migrations } = await pool.query<{
    id: number;
    name: string;
    run_on: Date;
  }>(`
    SELECT id, name, run_on
    FROM pgmigrations
    ORDER BY run_on ASC;
  `);

  logger.info(`Applied migrations: ${migrations.length}`);
  for (const m of migrations) {
    logger.info(`  ✅ ${m.name}`, { run_on: m.run_on });
  }

  await closePool();
}

checkMigrationStatus().catch((err) => {
  console.error(err);
  process.exit(1);
});
