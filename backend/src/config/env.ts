/**
 * env.ts — Typed, validated environment configuration.
 *
 * Reads process.env at startup, validates required variables, and exports a
 * frozen config object. Throws descriptive errors immediately on misconfiguration
 * so problems surface at boot time rather than at request time.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function optionalInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value || value.trim() === '') return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`[Config] Environment variable ${key} must be an integer, got: "${value}"`);
  }
  return parsed;
}

export interface AppConfig {
  readonly server: {
    readonly port: number;
    readonly nodeEnv: string;
    readonly isProduction: boolean;
    readonly isDevelopment: boolean;
  };
  readonly cors: {
    readonly origin: string;
  };
  readonly database: {
    readonly url: string;
    readonly poolMin: number;
    readonly poolMax: number;
    readonly connectionTimeoutMs: number;
    readonly idleTimeoutMs: number;
  };
  readonly log: {
    readonly level: string;
  };
}

function buildConfig(): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development');

  // DATABASE_URL is required — fail fast without it
  const databaseUrl = requireEnv('DATABASE_URL');

  return Object.freeze({
    server: {
      port: optionalInt('PORT', 4000),
      nodeEnv,
      isProduction: nodeEnv === 'production',
      isDevelopment: nodeEnv === 'development',
    },
    cors: {
      origin: optionalEnv('CORS_ORIGIN', 'http://localhost:3000'),
    },
    database: {
      url: databaseUrl,
      poolMin: optionalInt('DB_POOL_MIN', 2),
      poolMax: optionalInt('DB_POOL_MAX', 10),
      connectionTimeoutMs: optionalInt('DB_CONNECTION_TIMEOUT_MS', 5000),
      idleTimeoutMs: optionalInt('DB_IDLE_TIMEOUT_MS', 30000),
    },
    log: {
      level: optionalEnv('LOG_LEVEL', nodeEnv === 'production' ? 'info' : 'debug'),
    },
  });
}

// Singleton — evaluated once when the module is first imported
export const config: AppConfig = buildConfig();
