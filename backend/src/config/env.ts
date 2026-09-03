/**
 * env.ts — Typed, validated environment configuration.
 *
 * Reads process.env at startup, validates required variables, and exports a
 * frozen config object. Throws descriptive errors immediately on misconfiguration
 * so problems surface at boot time rather than at request time.
 */

import 'dotenv/config';

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
    readonly isTest: boolean;
    readonly apiKey?: string;
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
  readonly razorpay: {
    readonly keyId: string;
    readonly keySecret: string;
    readonly webhookSecret: string;
    readonly isConfigured: boolean;
    readonly isTestMode: boolean;
    readonly requestTimeoutMs: number;
    readonly baseUrl: string;
  };
  readonly auth: {
    readonly jwtSecret: string;
    readonly jwtExpiresIn: string;
  };
  readonly log: {
    readonly level: string;
  };
}

function buildConfig(): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development');
  const isTest = nodeEnv === 'test';

  // In test mode, fallback to a local test DB URL if not set
  const databaseUrl = isTest
    ? optionalEnv('DATABASE_URL', 'postgresql://localhost:5432/recoveriq_test')
    : requireEnv('DATABASE_URL');

  const razorpayKeyId = optionalEnv('RAZORPAY_KEY_ID', '');
  const razorpayKeySecret = optionalEnv('RAZORPAY_KEY_SECRET', '');
  const razorpayWebhookSecret = isTest
    ? optionalEnv('RAZORPAY_WEBHOOK_SECRET', 'test_webhook_secret_whsec_12345')
    : optionalEnv('RAZORPAY_WEBHOOK_SECRET', '');

  const isRazorpayConfigured = Boolean(razorpayKeyId && razorpayKeySecret);
  const isRazorpayTestMode = razorpayKeyId.startsWith('rzp_test_');

  // JWT secret: required in production, falls back to a dev-only placeholder
  const jwtSecretRaw = optionalEnv('JWT_SECRET', '');
  let jwtSecret: string;
  if (!jwtSecretRaw && nodeEnv === 'production') {
    throw new Error('[Config] JWT_SECRET is required in production');
  } else if (!jwtSecretRaw) {
    jwtSecret = 'DEV_ONLY_JWT_SECRET_CHANGE_IN_PRODUCTION_32chars';
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.warn('[RecoverIQ] WARNING: JWT_SECRET not set — using insecure dev default. Set JWT_SECRET in .env');
    }
  } else {
    jwtSecret = jwtSecretRaw;
  }

  return Object.freeze({
    server: {
      port: optionalInt('PORT', 4000),
      nodeEnv,
      isProduction: nodeEnv === 'production',
      isDevelopment: nodeEnv === 'development',
      isTest,
      apiKey: optionalEnv('RECOVERIQ_API_KEY', ''),
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
    razorpay: {
      keyId: razorpayKeyId,
      keySecret: razorpayKeySecret,
      webhookSecret: razorpayWebhookSecret,
      isConfigured: isRazorpayConfigured,
      isTestMode: isRazorpayTestMode,
      requestTimeoutMs: optionalInt('RAZORPAY_TIMEOUT_MS', 10000),
      baseUrl: optionalEnv('RAZORPAY_BASE_URL', 'https://api.razorpay.com/v1'),
    },
    auth: {
      jwtSecret,
      jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '30d'),
    },
    log: {
      level: optionalEnv('LOG_LEVEL', isTest ? 'error' : (nodeEnv === 'production' ? 'info' : 'debug')),
    },
  });
}

// Singleton — evaluated once when the module is first imported
export const config: AppConfig = buildConfig();
