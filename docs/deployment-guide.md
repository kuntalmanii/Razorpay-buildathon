# RecoverIQ — Production Deployment & Containerization Guide

**Target Environment:** AWS ECS / EKS, GCP Cloud Run / GKE, Docker Swarm, or Bare Metal VM  
**Prerequisites:** Node.js 20+, PostgreSQL 14+, Razorpay Merchant Account (Test or Live Mode)

---

## 1. Architecture Overview in Production

```
                                  ┌───────────────────────────────┐
                                  │   CloudFlare / ALB Ingress    │
                                  └───────────────┬───────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │                                                 │
                         ▼                                                 ▼
             ┌───────────────────────┐                         ┌───────────────────────┐
             │  recoveriq-frontend   │                         │  recoveriq-backend    │
             │   (Next.js Port 3000) │                         │   (Express Port 3001) │
             └───────────────────────┘                         └───────────┬───────────┘
                                                                           │
                                                  ┌────────────────────────┴───────────────────────┐
                                                  ▼                                                 ▼
                                      ┌────────────────────────┐                       ┌────────────────────────┐
                                      │  PostgreSQL (Port 5432)│                       │  Razorpay Gateway API  │
                                      │ (Connection Pool: 5-20)│                       │   (api.razorpay.com)   │
                                      └────────────────────────┘                       └────────────────────────┘
```

---

## 2. Docker Compose Production Specification (`docker-compose.production.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: recoveriq-db
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-recoveriq_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ChangeMeSecurePassword}
      POSTGRES_DB: ${POSTGRES_DB:-recoveriq_prod}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-recoveriq_admin} -d ${POSTGRES_DB:-recoveriq_prod}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: recoveriq-backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PORT: 3001
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-recoveriq_admin}:${POSTGRES_PASSWORD:-ChangeMeSecurePassword}@postgres:5432/${POSTGRES_DB:-recoveriq_prod}
      CORS_ORIGIN: ${CORS_ORIGIN:-https://recoveriq.yourdomain.com}
      RAZORPAY_KEY_ID: ${RAZORPAY_KEY_ID}
      RAZORPAY_KEY_SECRET: ${RAZORPAY_KEY_SECRET}
      RAZORPAY_WEBHOOK_SECRET: ${RAZORPAY_WEBHOOK_SECRET}
      RECOVERIQ_API_KEY: ${RECOVERIQ_API_KEY}
    ports:
      - "3001:3001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 15s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://api.recoveriq.yourdomain.com}
    container_name: recoveriq-frontend
    restart: always
    depends_on:
      - backend
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

---

## 3. Production Environment Variables Checklist

### Backend `.env`
| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | Yes | Set to `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string with SSL in production |
| `CORS_ORIGIN` | Yes | Allowed frontend origin URL (e.g. `https://recoveriq.yourdomain.com`) |
| `RAZORPAY_KEY_ID` | Yes | Razorpay Key ID (`rzp_test_...` or `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay Key Secret (never expose to frontend) |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Razorpay Webhook Secret for HMAC verification |
| `RECOVERIQ_API_KEY` | Optional | Shared API key for administrative endpoints |

### Frontend `.env.local`
| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Public backend API URL reached by browser clients |

---

## 4. Razorpay Webhook Endpoint Configuration

In the Razorpay Merchant Dashboard (`Settings > Webhooks > Add New Webhook`):
- **Webhook URL**: `https://api.recoveriq.yourdomain.com/api/webhooks/razorpay`
- **Secret**: Set a high-entropy secret and assign to `RAZORPAY_WEBHOOK_SECRET`
- **Active Events**:
  - `payment.failed`
  - `payment.captured`
  - `payment_link.paid`
  - `payment_link.cancelled`
  - `payment_link.expired`
  - `subscription.halted`
  - `subscription.charged`
  - `subscription.cancelled`

---

## 5. Health Checks & Telemetry

- **Liveness Probe**: `GET /health` (Returns HTTP 200 with uptime and service name)
- **Readiness Probe**: `GET /api/health` (Returns HTTP 200 with database latency, connection pool state, and Razorpay gateway status)
