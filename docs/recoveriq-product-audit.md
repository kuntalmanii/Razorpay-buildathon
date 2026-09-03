# RecoverIQ — Product Audit

> **Audit Date:** 2026-09-03
> **Audited By:** Antigravity (AI Code Inspector)
> **Scope:** Full-stack inspection — `/frontend` and `/backend`. No code was modified.

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Existing Features](#2-existing-features)
3. [Existing Frontend Routes](#3-existing-frontend-routes)
4. [Existing Backend APIs](#4-existing-backend-apis)
5. [Reusable Components](#5-reusable-components)
6. [Missing Product Features](#6-missing-product-features)
7. [Recommended Extension Plan](#7-recommended-extension-plan)
8. [Potential Regression Risks](#8-potential-regression-risks)

---

## 1. Current Architecture

### System Overview

```
recoveriq/
├── frontend/     (Next.js 16 / React 19 — App Router)
└── backend/      (Express 4 / Node.js ≥20 — TypeScript)
```

The two applications are fully decoupled and must remain in separate top-level folders. They communicate exclusively over HTTP REST (the frontend calls `NEXT_PUBLIC_API_URL`, which defaults to `http://localhost:4000`).

---

### Frontend

| Property             | Value |
|----------------------|-------|
| **Framework**        | Next.js `^16.3.3` (App Router) |
| **Language**         | TypeScript 5.9 |
| **React version**    | React 19.2 |
| **Styling**          | Tailwind CSS 3.4 + `tailwind-merge` + `clsx` |
| **State management** | Local component state (`useState`, `useCallback`, `useEffect`) — no global state library |
| **Routing**          | Next.js App Router (`/src/app/**`) with file-based routing |
| **API layer**        | Centralized `apiClient` singleton in `/src/lib/api-client.ts` |
| **Icon library**     | `lucide-react ^0.468` |
| **Charts**           | `recharts ^2.15.4` |
| **Animation**        | Native CSS via Tailwind `motion-safe:animate-in`, `fade-in-50`, `slide-in-from-bottom`. No external animation library installed. |
| **Fonts**            | Geist Sans + Geist Mono (via `next/font/google`) |
| **Design tokens**    | Centralized in `/src/styles/tokens.ts` (colors, chart colors, radii) |

**Design system color palette (editorial dark warm):**
- Background `#151513`, Surface `#1C1B18`, Elevated `#24221E`
- Text primary `#F2EDE3`, secondary `#B7B0A3`, muted `#817A70`
- Accent brass `#B89A62` / `#D1B982`
- Status: success `#6F9B7A`, warning `#B68B4F`, danger `#B56F68`, info `#71879A`

---

### Backend

| Property             | Value |
|----------------------|-------|
| **Framework**        | Express `^4.19.2` |
| **Language**         | TypeScript 5.5 |
| **Runtime**          | Node.js >=20 |
| **Database**         | PostgreSQL via `pg` (node-postgres) with connection-pool singleton |
| **ORM/Query builder**| Raw SQL via `pg.Pool.query()` — no ORM used |
| **Migrations**       | `node-pg-migrate ^9` (13 migration files) |
| **Validation**       | Zod `^3.25` (AI decision schemas); manual validators for request parsing |
| **Dev fallback**     | `devMemoryStore.ts` — an in-memory SQL emulator that activates automatically when Postgres is unavailable in dev/test mode |
| **AI integration**   | Pluggable `AIProvider` interface; default uses `OpenAICompatibleProvider` (supports any OpenAI-compatible API) falling back to `MockAIProvider` |
| **Razorpay SDK**     | Custom REST wrapper (`razorpay.client.ts`) — no official Razorpay Node SDK |
| **Background workers** | Manual polling workers (`recovery.worker.ts`, `retry.worker.ts`, `verification.worker.ts`) — no queue system |
| **Default port**     | `4000` (configured via `PORT` env var) |

---

## 2. Existing Features

### Backend Features

#### Database Schema (13 migrations, fully designed)

| Table | Purpose |
|-------|---------|
| `merchants` | Multi-tenant merchant accounts |
| `customers` | Customer records per merchant |
| `payments` | Razorpay payment records |
| `subscriptions` | Razorpay subscription records |
| `revenue_risk_cases` | Core recovery case entity |
| `recovery_actions` | Proposed and executed recovery actions (with idempotency) |
| `ai_decisions` | Immutable AI reasoning records |
| `webhook_events` | Razorpay webhook ingestion log |
| `audit_logs` | Full immutable audit trail |
| `policy_rules` | Configurable per-merchant policy constraints |
| `notification_attempts` | Customer notification records |
| `enums` | All PostgreSQL enum types |

#### AI Recovery Agent (`/backend/src/agents/recovery/`)
- **RecoveryAgent** — orchestrates read-only context extraction, LLM inference, schema validation, and immutable decision persistence to `ai_decisions`
- **Pluggable AIProvider interface** — OpenAI-compatible and MockProvider implementations
- **CaseContextExtractor** — gathers case context without exposing credentials to the LLM
- **PromptBuilder** — assembles sanitized prompts
- **DecisionParser** — validates AI output against strict Zod schema; creates deterministic fallback on failure
- **Timeout guard** — 10,000ms AI call timeout with automatic fallback

#### Policy Engine (`/backend/src/policies/`)
- **PolicyEngine** — deterministic, rule-based pre-execution gate (separate from AI)
- **PolicyValidator** — evaluates context against rules (max retries, cooldown hours, high-value thresholds, case status checks)
- **PolicyRules** — configurable rule set stored in DB `policy_rules` table
- **Audit logging** — every policy evaluation (approved/blocked) is written to `audit_logs`

#### Recovery Orchestration (`/backend/src/services/recovery/`)
- **RecoveryOrchestrator** — coordinating entry point for full recovery lifecycle
- **RecoveryExecutor** — dispatches approved actions via Razorpay APIs
- **RecoveryVerifier** — checks payment status post-action (safety: avoids double-billing)
- **PaymentLinkRecovery** — creates Razorpay payment links for failed payments
- **RetryRecovery** — retries failed payment attempts

#### Risk Engine (`/backend/src/services/risk/`)
- **RevenueRiskService** — case lifecycle state machine (OPEN -> DIAGNOSED -> ACTION_PENDING -> ...)
- **RiskScoreService** — computes risk score from failure category, amount, payment history
- **RecoveryProbabilityService** — estimates recovery probability
- **FailureClassifier** — classifies payment failure categories

#### Razorpay Integration (`/backend/src/services/razorpay/`)
- **RazorpayClient** — custom REST client with timeout, error classification, test mode detection
- **PaymentService** — capture, fetch, retry payments
- **PaymentLinkService** — create, fetch, expire payment links
- **SubscriptionService** — pause/resume subscriptions

#### Webhook System (`/backend/src/webhooks/`)
- **RazorpayWebhookService** — HMAC-SHA256 signature verification, database-enforced deduplication, async event routing
- **SignatureService** — constant-time HMAC validation
- **EventRouter** — dispatches events to typed handlers
- **Handlers** — `payment.failed`, `payment.captured`, `subscription.halted`, etc.

#### Simulation Engine (`/backend/src/simulation/`)
- **SimulationManager** — orchestrates fault injection scenarios
- **Scenarios:** AI faults, Razorpay gateway faults, state machine faults, webhook replay faults
- **SimulationController** + **SimulationRouter** — `/api/simulation/run-scenario` endpoint

#### Test Suite (14 test files)
- Policy engine, recovery agent, Razorpay integration, webhook handling, multi-tenant isolation, e2e QA, failure simulation, risk engine, validation, error handling, health, dashboard, cases

#### Middleware Stack
- `requestId` — UUID per request
- `requestLogger` — structured JSON logging
- `rateLimiter` — in-memory sliding window (300 req/min general, 1000 req/min webhooks)
- `apiAuth` — API Key / Bearer token auth (pass-through if `RECOVERIQ_API_KEY` unset)
- `notFound` — 404 handler
- `errorHandler` — global error formatter (never leaks internals)

### Frontend Features

#### Command Center / Dashboard (`/features/dashboard/`)
- **CommandCenter** — main telemetry hub with real-time stats, Recharts bar charts (failure breakdown), active automations, revenue at-risk metrics
- **DashboardView** — KPI cards (revenue at risk, recovered, open cases, recovery rate), breakdown chart, recent cases table with status badges

#### Recovery Cases (`/features/recovery-cases/`)
- **RecoveryCasesView** — paginated cases list with status filters, failure category filters, search
- **RecoveryCasesList** — table with risk scores, amounts, status badges, action links
- **RecoveryCaseDetail** — full case deep-dive: case metadata, recovery actions timeline, audit trail, AI decision summary
- **RecoveryFlowVisualizer** — animated flow diagram showing webhook > AI > policy > execution pipeline
- **AddCaseModal** — manual case creation form
- **EditCaseDrawer** — slide-out drawer to edit case status, scores, customer details

#### AI Decisions (`/features/ai-decisions/`)
- **AiDecisionsFeed** — live feed of all AI decisions with confidence bars, decision types, timestamps
- **AiDecisionsView** — wrapper with filters
- **CaseDecisionDeepDive** — per-case decision drill-down: reasoning summary, confidence score, risk flags, customer message, execution payload

#### Audit Trail (`/features/audit/`)
- **AuditTimeline** — chronological audit log timeline with actor type icons, before/after state diffing
- **AuditView** — wrapper with entity type and date filters

#### Evaluation Dashboard (`/features/evaluation/`)
- **EvaluationDashboard** — benchmark metrics: diagnosis accuracy %, recovery precision %, false intervention rate, avg recovery time, policy violations blocked, duplicate actions prevented, human escalations, category breakdown table
- **WebhookFeedView** — live webhook event stream with signature verification status, processing status

#### Demo / Judge Mode (`/components/demo/`)
- **JudgeDemoBar** — persistent bottom bar for live scenario execution (4 pre-built scenarios: full recovery lifecycle, unsafe AI blocked, gateway timeout + safe retry, duplicate webhook defense)

#### Layout Components
- **Sidebar** — sticky navigation with 5 nav items, brand header, active state indicators, SystemStatusDrawer at bottom
- **Header** — page-level title + subtitle bar
- **SystemStatusDrawer** — real-time subsystem telemetry (DB, AI, Razorpay, Workers) polled every 30 seconds

---

## 3. Existing Frontend Routes

| Route | Page Component | Feature Component | Description |
|-------|---------------|-------------------|-------------|
| `/` | `app/page.tsx` | `CommandCenter` | Root renders Command Center |
| `/dashboard` | (sidebar active link) | `CommandCenter` | Same as root — sidebar treats both as active |
| `/recovery-cases` | `app/recovery-cases/page.tsx` | `RecoveryCasesView` | Paginated cases list with filters |
| `/recovery-cases/[id]` | `app/recovery-cases/[id]/page.tsx` | `RecoveryCaseDetail` | Case detail with audit, actions, AI summary |
| `/recovery-cases/[id]/decision` | `app/recovery-cases/[id]/decision/page.tsx` | `CaseDecisionDeepDive` | AI reasoning + policy deep-dive per case |
| `/ai-decisions` | `app/ai-decisions/page.tsx` | `AiDecisionsFeed` | Global AI decisions feed |
| `/audit` | `app/audit/page.tsx` | `AuditView` | Full system audit trail |
| `/evaluation` | `app/evaluation/page.tsx` | `EvaluationDashboard` | Benchmark metrics + webhook feed |

> **Note:** The root `/` page renders `CommandCenter` directly. The sidebar links to `/dashboard` which is not a distinct route — the sidebar's `isActive` check treats `/` and `/dashboard` as the same page. No `app/dashboard/page.tsx` file exists.

---

## 4. Existing Backend APIs

All endpoints are prefixed `/api/` and protected by `apiAuthMiddleware` (pass-through in dev when `RECOVERIQ_API_KEY` is unset). Rate limit: 300 req/min.

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Basic service health (unauthenticated) |
| `GET` | `/api/health` | Detailed subsystem telemetry (DB, Razorpay, AI, Workers) |

### Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard/summary` | Aggregated KPIs: cases by status, revenue at-risk, recovery rate |
| `GET` | `/api/dashboard/audit` | Paginated audit logs (optional: `entity_type`, `entity_id`, `page`, `limit`) |

### Recovery Cases

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recovery-cases` | Paginated list (filters: `status`, `failure_category`, `page`, `limit`) |
| `POST` | `/api/recovery-cases` | Create a new case manually |
| `GET` | `/api/recovery-cases/:id` | Fetch single case by ID |
| `PATCH` | `/api/recovery-cases/:id` | Update case fields (status, scores, customer info) |
| `GET` | `/api/recovery-cases/:id/audit` | Audit logs for a specific case |
| `GET` | `/api/recovery-cases/:id/actions` | Recovery actions for a specific case |

### Recovery Actions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recovery-actions` | Paginated list of all actions (filters: `case_id`, `execution_status`) |

### Metrics

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/metrics` | Time-windowed metrics (`?days=30`): failure categories, action types, webhook statuses |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/razorpay` | Razorpay webhook ingestion (HMAC verified, deduplicated) |
| `POST` | `/api/webhooks/razorpay/simulate` | Dev-only webhook simulation |
| `GET` | `/api/webhooks/events` | Paginated webhook event log |

### Evaluation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/evaluation` | Fetch the latest benchmark evaluation report |
| `POST` | `/api/evaluation/run` | Execute a full benchmark evaluation run |

### Simulation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/simulation/run-scenario` | Run a fault injection scenario (body: `{ scenario, caseId }`) |

---

## 5. Reusable Components

### Frontend — Reusable UI Components (`/src/components/ui/`)

| Component | File | Description |
|-----------|------|-------------|
| `Badge` | `badge.tsx` | Status pill badge with variant colors |
| `Button` | `button.tsx` | Primary/secondary/ghost button with loading state |
| `Card` | `card.tsx` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` |
| `EmptyState` | `empty-state.tsx` | Zero-data placeholder with icon + message |
| `ErrorState` | `error-state.tsx` | Error fallback with retry button |
| `Skeleton` | `skeleton.tsx` | Loading skeleton (block + `CardSkeleton`) |
| `Tooltip` | `tooltip.tsx` | Hover tooltip wrapper |

### Frontend — Reusable Layout Components (`/src/components/layout/`)

| Component | File | Description |
|-----------|------|-------------|
| `Sidebar` | `sidebar.tsx` | Fixed navigation sidebar with 5 nav items |
| `Header` | `header.tsx` | Page-level title + subtitle |
| `SystemStatusDrawer` | `system-status-drawer.tsx` | Real-time subsystem health widget (30s poll) |

### Frontend — Shared Libraries

| Module | File | Description |
|--------|------|-------------|
| `apiClient` | `lib/api-client.ts` | Centralized typed API client (all 15+ methods) |
| `formatINR`, `formatDate`, `getStatusBadge`, `cn` | `lib/utils.ts` | Formatting utilities, class name merger |
| Design tokens | `styles/tokens.ts` | All color, chart, and radius design constants |
| API types | `types/api.ts` | 12 TypeScript interfaces matching backend contracts |

### Backend — Reusable Services

| Service | Path | Description |
|---------|------|-------------|
| `PolicyEngine` | `policies/policy-engine.ts` | Deterministic safety evaluation |
| `RecoveryAgent` | `agents/recovery/recovery-agent.ts` | AI decision generation with fallback |
| `RazorpayClient` | `services/razorpay/razorpay.client.ts` | Razorpay REST wrapper |
| `RazorpayWebhookService` | `webhooks/razorpay-webhook.service.ts` | HMAC-verified webhook ingestion |
| `RevenueRiskService` | `services/risk/revenue-risk.service.ts` | Case state machine transitions |
| `logger` | `utils/logger.ts` | Structured JSON logger |
| `errors` | `utils/errors.ts` | Typed `AppError` hierarchy (`UnauthorizedError`, `NotFoundError`, `ValidationError`, etc.) |
| `asyncHandler` | `utils/asyncHandler.ts` | Promise-safe Express route wrapper |
| `sendSuccess` / `buildPaginationMeta` | `utils/response.ts` | Consistent API response formatter |
| `devMemoryStore` | `database/devMemoryStore.ts` | Auto-activating in-memory DB for dev/demo |

---

## 6. Missing Product Features

### 6.1 Authentication — Completely Absent

The backend `apiAuth.ts` middleware implements API Key / Bearer token auth for machine-to-machine access (single shared key), but there is no user authentication system of any kind:

- No user/session model in DB schema (no `users` table)
- No JWT session management (`JWT_SECRET` env var exists but is unused in code)
- No login / logout / register endpoints
- No password hashing
- No session storage (cookies or tokens)
- No Next.js auth middleware (`middleware.ts`) to protect frontend routes
- No user identity on the frontend — the app is fully open when backend API key is unset (which is the default dev configuration)

### 6.2 Role-Based Authorization — Completely Absent

- No roles or permissions model (no `ADMIN`, `ANALYST`, `OPERATOR` concepts)
- No per-route authorization gates on the backend
- No UI elements conditioned on role (e.g. admin-only tabs, action buttons)
- No multi-tenant scoping of API results based on authenticated user's merchant

> **Critical Risk:** The current `apiAuthMiddleware` checks a single shared static API key. It does NOT differentiate users, roles, or merchants. Any valid key holder has full read/write access to all merchants' data.

### 6.3 User Dashboard — Absent

The current "dashboard" is an operator/system telemetry view (Command Center) — it shows global recovery metrics across all merchants. There is:

- No personalized user dashboard scoped to a specific merchant
- No "My Cases" filtered by logged-in user's merchant
- No user profile page
- No account settings page

### 6.4 Admin Dashboard — Absent

- No admin-only section or route group
- No user management UI (create/invite users, assign roles)
- No merchant management (add/edit/suspend merchants)
- No global system configuration UI
- No API key management UI

### 6.5 Notification System — Partially Designed

- The DB schema has a `notification_attempts` table (migration `00012`)
- No `NotificationService` or notification endpoints exist in the backend
- No notification UI in the frontend
- `send_notification` is listed as a valid `action_type` in domain types but has no executor

### 6.6 Dedicated AI Decisions API Endpoint — Absent

The `decision` sub-route exists (`/recovery-cases/[id]/decision/page.tsx`) but the backend has no dedicated AI decisions list endpoint:

- No `/api/recovery-cases/:id/decisions` endpoint
- No `/api/ai-decisions` global endpoint
- The `ai_decisions` table exists in the DB schema but is not exposed via API

### 6.7 Global State Management — Missing

- The frontend uses only local component state. As the application grows with auth, user preferences, and multi-tenant data, the lack of a global state solution (React Context, Zustand, etc.) will cause prop drilling and redundant API calls.

---

## 7. Recommended Extension Plan

### Phase 1: Authentication Foundation

**Do NOT rebuild existing pages.** Wrap them with auth guards.

#### Backend — New Files to Create

1. `src/database/migrations/20260903000014_create-users.ts` — `users` table with `user_id`, `email`, `password_hash`, `role` (`admin | analyst | operator`), `merchant_id` FK, `is_active`, timestamps
2. `src/services/auth/auth.service.ts` — bcrypt password hashing, JWT sign/verify, session utilities
3. `src/controllers/authController.ts` — `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
4. `src/routes/api/auth.ts` — wire auth routes (unauthenticated)
5. `src/middleware/jwtAuth.ts` — validate `Authorization: Bearer <JWT>` and attach `req.user`; replaces or extends `apiAuth.ts`
6. `src/middleware/roleGuard.ts` — role-based authorization middleware factory (`requireRole('admin')`)

#### Backend — Files to Extend (not rebuild)

- `src/routes/api/index.ts` — swap `apiAuthMiddleware` for `jwtAuthMiddleware`; keep all existing routes intact
- `src/config/env.ts` — `JWT_SECRET` already in `.env.example`; add `JWT_EXPIRES_IN` config
- `src/types/domain.ts` — add `User` interface

#### Frontend — New Files to Create

1. `src/app/(auth)/login/page.tsx` — login page (outside the sidebar layout)
2. `src/app/(auth)/layout.tsx` — auth-specific layout (no sidebar)
3. `src/middleware.ts` — Next.js Edge middleware to check JWT cookie and redirect unauthenticated users from protected routes to `/login`
4. `src/features/auth/login-form.tsx` — login form component
5. `src/lib/auth-client.ts` — auth-specific API client methods (`login`, `logout`, `getMe`)
6. `src/contexts/auth-context.tsx` — React context providing `user`, `logout`, `isAdmin`

#### Frontend — Files to Extend (not rebuild)

- `src/components/layout/sidebar.tsx` — add user avatar + logout button at bottom
- `src/lib/api-client.ts` — add `Authorization` header injection from stored JWT token

---

### Phase 2: User Dashboard (Merchant-Scoped)

- Extend `/dashboard` page — add merchant-scoped filter based on `req.user.merchant_id`
- Backend: modify `DashboardController.getSummary()` to filter by merchant ID from JWT claims
- No new pages needed — just data scoping

---

### Phase 3: Admin Dashboard

Create a new route group: `src/app/(admin)/admin/...`

- `admin/users/page.tsx` — user list + invite
- `admin/merchants/page.tsx` — merchant management
- `admin/policy-rules/page.tsx` — policy rule CRUD (backend table already exists)

Backend: add admin-only routes (`requireRole('admin')`) for user CRUD and merchant management.

---

## 8. Potential Regression Risks

### 8.1 Auth Middleware Migration Risk — HIGH

The current `apiAuthMiddleware` auto-passes when `RECOVERIQ_API_KEY` is empty (dev mode). Replacing it with JWT auth will break the frontend immediately unless login is implemented first, the frontend stores and sends JWT on all API calls, and dev mode has a bypass or test credentials.

**Mitigation:** Deploy auth changes incrementally — add JWT middleware alongside the existing key check initially, then deprecate the key check.

---

### 8.2 Route Naming Conflict Risk — MEDIUM

The sidebar links to `/dashboard` but the root page (`/`) also renders `CommandCenter`. There is no actual `app/dashboard/page.tsx` file. Adding auth middleware that redirects `/` to `/login` when unauthenticated must also handle `/dashboard`.

**Mitigation:** Verify that Next.js middleware redirect logic handles both `/` and `/dashboard`.

---

### 8.3 API Client Authentication Injection — MEDIUM

`api-client.ts` currently sends no auth headers by default (the `fetchJson` helper has no auth injection). All 15+ methods will need token injection after auth is implemented.

**Mitigation:** Add a single centralized `getAuthHeaders()` helper to `fetchJson`/`fetchPaginated` — do not modify each method individually.

---

### 8.4 Multi-Tenant Data Leakage Risk — HIGH

Current API endpoints return all merchants' data regardless of who is calling. For example:
- `GET /api/recovery-cases` returns cases from ALL merchants
- `GET /api/dashboard/summary` aggregates ALL merchants

Once user auth is added, API queries must be scoped by `merchant_id` extracted from JWT claims. Failure to do so will leak cross-merchant data.

**Mitigation:** Add `merchant_id` WHERE clause to all SQL queries in `CasesService`, `DashboardService`, `ActionsService`, etc. — use the authenticated user's merchant, not a query parameter (which could be spoofed).

---

### 8.5 In-Memory Dev Store Behavior — LOW-MEDIUM

The `devMemoryStore` auto-activates when Postgres is unavailable. It contains hardcoded seed data with `merchant_id = 'MID_DEV_001'`. Once multi-tenant scoping is enforced, the seed data's merchant IDs must match the dev user's JWT claims, or the dev store will return empty results for authenticated users.

**Mitigation:** Update `devMemoryStore` seed data to align with dev user merchant IDs; or add a dev-mode bypass for merchant scoping.

---

### 8.6 Webhook Exemption Must Be Preserved — MEDIUM

`apiAuth.ts` explicitly exempts `/api/webhooks/razorpay` from API key checks (it uses HMAC verification instead). When migrating to JWT auth, this exemption must be preserved — Razorpay cannot send JWTs.

**Mitigation:** Copy the webhook exemption logic into the new `jwtAuth.ts` middleware exactly.

---

### 8.7 JudgeDemoBar — Open Access Tool — LOW

The `JudgeDemoBar` at the bottom of every page can trigger fault injection scenarios (`/api/simulation/run-scenario`). This must be restricted to admin users only after auth is implemented, or removed from the global layout and placed only in an admin-scoped section.

---

### 8.8 No Duplicate Components Found

After full inspection, no duplicate components were identified. Each component has a clear single responsibility and is referenced from only one location. No dead code was found in the component tree — all feature components are wired to actual pages.

---

### 8.9 Existing Functionality That Must NOT Be Duplicated

| Existing Item | Do NOT Recreate |
|---------------|-----------------|
| `apiClient` singleton | Do not create a second API client file; extend the existing one |
| `errorHandler` middleware | Do not add per-route try/catch; use `asyncHandler` wrapper |
| `PolicyEngine` | Do not add AI-side policy checks; the deterministic engine already exists |
| `RecoveryAgent` | Do not build a new AI integration; extend the existing pluggable provider |
| UI components in `/components/ui/` | Do not recreate `Badge`, `Button`, `Card`, `Skeleton`, `EmptyState`, `ErrorState`, `Tooltip` |
| Design tokens in `tokens.ts` | Do not introduce new color values; use the existing token palette |
| `devMemoryStore` fallback | Do not add a second dev data mechanism; extend the existing store |
| Rate limiter middleware | Do not add per-route rate limiting; the global limiter already covers `/api/*` |

---

*End of RecoverIQ Product Audit — v1.0*
