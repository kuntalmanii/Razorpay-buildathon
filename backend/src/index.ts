import express, { Application, Request } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables before importing anything that reads process.env
dotenv.config();

import { config } from './config';
import { logger } from './utils/logger';
import { testConnection, closePool } from './database/connection';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { generalApiLimiter } from './middleware/rateLimiter';
import { healthRouter } from './routes/health';
import { apiRouter } from './routes/api';

const app: Application = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(requestId);

// JSON parser with raw body buffer capture for HMAC webhook verification
app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf.toString('utf-8');
    },
  })
);

app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);
app.use(requestLogger);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api', generalApiLimiter, apiRouter);

// ─── 404 + Global Error Handler ───────────────────────────────────────────────
// notFound must come after all routes; errorHandler must be last
app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  // Probe DB connectivity at startup (warn, don't crash — DB may not be ready)
  logger.info('Probing database connection...');
  const dbHealth = await testConnection();
  if (dbHealth.status === 'ok') {
    logger.info('Database connected', { latency_ms: dbHealth.latency_ms });
  } else {
    logger.warn('Database not reachable at startup — check DATABASE_URL', {
      error: dbHealth.error,
    });
  }

  app.listen(config.server.port, () => {
    logger.info(`RecoverIQ backend started`, {
      port: config.server.port,
      env: config.server.nodeEnv,
      url: `http://localhost:${config.server.port}`,
    });
  });
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal} — shutting down gracefully`);
  await closePool();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  });
}

export default app;
