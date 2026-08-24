import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health';

// Load environment variables from .env (if present)
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT ?? 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);

// ─── 404 Catch-all ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(
    `[RecoverIQ Backend] Running in ${process.env.NODE_ENV ?? 'development'} mode on http://localhost:${PORT}`
  );
});

export default app;
