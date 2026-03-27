```
 ___         _   _          _   ___  _      _    __
| __|__ ___ | |_(_)_ ____ _| | | _ \| |__ _| |_ / _|___ _ _ _ __
| _/ -_|_-<|  _| \ V / _` | | |  _/| / _` |  _|  _/ _ \ '_| '  \
|_|\___/__/ \__|_|\_/\__,_|_| |_|  |_\__,_|\__|_| \___/_| |_|_|_|

 White-label template for live music & electronic festival websites
```

[![CI](https://github.com/Neiland85/festival-platform-template/actions/workflows/ci.yml/badge.svg)](https://github.com/Neiland85/festival-platform-template/actions)
[![Security](https://img.shields.io/badge/security-hardened-green)](docs/compliance/)
[![License](https://img.shields.io/badge/license-Custom%20MIT-blue)](#license)

---

## Table of Contents

- [Overview](#overview)
- [What Is Built and Working](#what-is-built-and-working)
- [What Is Prepared but Not Yet Active](#what-is-prepared-but-not-yet-active)
- [Architecture](#architecture)
- [Security Stack](#security-stack)
- [Quick Start](#quick-start)
- [White-Label Customization](#white-label-customization)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Testing & Quality](#testing--quality)
- [Load Testing (k6)](#load-testing-k6)
- [CI/CD Pipeline](#cicd-pipeline)
- [Compliance & Governance](#compliance--governance)
- [Maturity Status](#maturity-status)
- [Support & Contact](#support--contact)
- [License](#license)

---

## Overview

A **white-label Next.js 15 template** for music festival and live event websites. Designed for operators, agencies, and developers who need a production-ready foundation with ticket sales, lead capture, admin dashboard, and enterprise-grade security.

Not a starter kit. Not a tutorial project. A working platform with hardened infrastructure, tested order lifecycle, and real security posture.

**Stack:** Next.js 15 (App Router) / React 19 / TypeScript 5 (strict) / Tailwind 4 / PostgreSQL 15 / Drizzle ORM / Stripe / Upstash Redis / Sentry / Sanity CMS

---

## What Is Built and Working

These features are implemented, tested, and running in production:

- **Ticket sales pipeline** — Stripe Checkout with webhook verification, atomic capacity reservation (PostgreSQL transactions), status-guarded state transitions, dual-layer idempotency
- **Lead capture** — GDPR/RGPD consent flow, soft-delete, IP hashing, data portability
- **Admin dashboard** — Event CRUD, leads management, orders, system health, persistent audit log
- **Security hardening** — WAF (70+ patterns), rate limiting (Redis + in-memory fallback), CSRF (mandatory in prod), bcrypt passwords, security headers (HSTS, CSP), supply chain protections
- **i18n** — Spanish/English with `next-intl`, locale-aware routing
- **CI/CD** — 466+ tests, Husky pre-commit hooks, eslint-plugin-security, semantic versioning, automated Vercel deploys
- **Graceful degradation** — every external service is optional with local fallback

---

## What Is Prepared but Not Yet Active

These modules are implemented but not yet connected to runtime paths. They represent architectural preparation for future activation:

| Module | What Exists | What Is Missing |
|--------|------------|-----------------|
| **Multi-tenancy** | Tenant registry table, schema provisioner, AsyncLocalStorage context propagation | Runtime query scoping (`SET search_path`). All queries currently hit `public` schema. Strategy approved, implementation deferred. |
| **OpenTelemetry** | SDK initialization, HTTP exporter, Next.js instrumentation hook | Route and query instrumentation. No spans are created on any operation. |
| **2FA TOTP** | TOTP secret generation, QR code generation, token verification | User enrollment flow, login integration, recovery codes. |
| **AES-256-GCM encryption** | Encrypt/decrypt utilities with authenticated encryption | Not applied to any stored data. Available as a library. |
| **Dead-letter queue** | PostgreSQL table for failed webhook events, write/list/resolve functions | No admin retry UI. No automated reconciliation. Manual review via database. |
| **OpenAPI spec** | Auto-generated from Zod schemas, served at `/api/docs` | Covers 3 of ~15 endpoints. No request validation middleware. |
| **Codecov** | CI runs coverage and uploads | Requires Codecov token configuration to activate. |

---

## Architecture

```
                          INTERNET
                             |
                    [Vercel Edge Network]
                             |
              +--------------+--------------+
              |         MIDDLEWARE           |
              |  Rate Limit / CORS / Auth   |
              |  Security Headers           |
              +--------------+--------------+
                             |
         +-------------------+-------------------+
         |                   |                   |
    [Public API]       [Admin API]         [Webhooks]
    /api/v1/*          /api/admin/*        Stripe / CMS
         |                   |                   |
         +-------------------+-------------------+
                             |
              +--------------+--------------+
              |        DOMAIN LAYER         |
              |  Events / Orders / Leads    |
              |  Zod Contracts / Validation |
              +--------------+--------------+
                             |
              +--------------+--------------+
              |         ADAPTERS            |
              |  PostgreSQL (Drizzle ORM)   |
              |  Stripe / Sanity CMS        |
              |  Redis (Circuit Breaker)    |
              +--------------+--------------+
                             |
              +--------------+--------------+
              |       OBSERVABILITY         |
              |  Metrics / Audit Log        |
              |  Request Tracer / Alerts    |
              +--------------+--------------+
```

**Design principles:**

- **Graceful degradation** — every external service is optional with local fallback
- **Defense in depth** — security at edge, middleware, application, and data layers
- **Adapter pattern** — swappable integrations without touching domain logic
- **Atomic state transitions** — PostgreSQL transactions with status guards for order lifecycle

---

## Security Stack

| Layer | Implementation | Status |
|-------|---------------|--------|
| **Web Application Firewall** | 70+ attack patterns: SQLi, XSS, path traversal, command injection, SSRF | Active |
| **Rate Limiting** | Redis-backed sliding window (distributed), in-memory fallback, stricter on auth endpoints | Active |
| **Authentication** | bcrypt hashed passwords, HMAC-SHA256 sessions, session rotation | Active |
| **CSRF Protection** | Mandatory in production, timing-safe token comparison, deny-by-default | Active |
| **Security Headers** | HSTS, CSP, X-Frame-Options, X-Content-Type-Options via `next.config.ts` | Active |
| **Supply Chain** | `.npmrc` hardened, `pnpm audit` in CI, frozen lockfile, Dependabot, integrity monitoring | Active |
| **Privacy** | GDPR/RGPD: IP hashing (SHA-256), soft-delete, consent tracking | Active |
| **DDoS Shield** | Connection limiting, request throttling, payload validation, slowloris protection | Active |
| **2FA TOTP** | Library integrated (secret generation, QR, verification) | Prepared, not wired to login |
| **AES-256-GCM** | Encryption utilities available | Prepared, not applied to data |

Full documentation: [`docs/compliance/`](docs/compliance/)

---

## Quick Start

**Prerequisites:** Node 22+, pnpm, Docker.

```bash
git clone <your-repo-url>
cd festival-platform-template
pnpm install
pnpm setup      # Docker + DB + schema + seed (~30s)
pnpm dev        # http://localhost:3000
```

Admin dashboard: `/dashboard` (password from `ADMIN_PASSWORD` in `.env.local`).

### What `pnpm setup` does

1. Copies `.env.example` to `.env.local` (skips if exists)
2. Starts PostgreSQL 15 via Docker Compose
3. Waits for healthy status
4. Pushes Drizzle schema
5. Seeds demo data

Clean slate: `docker compose down -v && pnpm setup`

---

## White-Label Customization

### Branding

All branding is centralized in `src/config/site.ts` and environment variables:

| What to change | Where |
|---------------|-------|
| Festival name | `NEXT_PUBLIC_SITE_NAME` in `.env.local` |
| Site URL | `NEXT_PUBLIC_SITE_URL` in `.env.local` |
| Tagline | `NEXT_PUBLIC_SITE_TAGLINE` in `.env.local` |
| Logo | Replace `/public/festival_logo.png` |
| Hero video | Replace `/public/hero/hero.mp4` |
| Color palette | CSS variables in `src/app/globals.css` |

### Payment Priority Chain

```
1. Stripe      → Event has price_cents + STRIPE_SECRET_KEY configured
2. Ticketmaster → Event has ticketUrl
3. Coming soon  → Neither configured
```

### Content & Translations

- Update `messages/es.json` and `messages/en.json`
- Customize pages under `src/app/[locale]/`

---

## Environment Variables

See `.env.example` for complete reference with inline documentation.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Admin dashboard password (bcrypt hashed in production) |
| `SESSION_SECRET` | Session token secret, 32+ chars (`openssl rand -hex 32`) |

### Optional Services

| Variable | Service | What it enables |
|----------|---------|----------------|
| `STRIPE_SECRET_KEY` | Stripe | Native ticket checkout |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity CMS | CMS at `/studio` |
| `SENTRY_DSN` | Sentry | Error tracking |
| `REDIS_URL` | Redis | Distributed rate limiting |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry | Distributed tracing (prepared, not instrumented) |
| `AUTO_REFUND_EXPIRED_ORDERS` | Stripe | Auto-refund for paid-but-expired orders (not yet implemented) |

---

## Project Structure

```
src/
├── adapters/                 # External service integrations
│   ├── cms/                  # Sanity CMS client + queries
│   ├── db/                   # PostgreSQL (Drizzle ORM, repositories)
│   └── payments/stripe/      # Stripe checkout + webhooks
├── app/                      # Next.js App Router
│   ├── [locale]/             # i18n routes (ES/EN)
│   ├── api/v1/               # Public API (events, leads, checkout)
│   ├── api/admin/            # Admin API (metrics, orders, audit)
│   ├── api/docs/             # OpenAPI 3.1 spec (partial)
│   └── dashboard/            # Admin panel
├── config/                   # White-label configuration
├── contracts/schemas/        # Zod validation schemas
├── domain/                   # Business logic (events, orders, leads)
├── lib/
│   ├── auth/                 # Authentication, RBAC
│   ├── observability/        # Metrics, audit, tracing, OTEL (prepared)
│   ├── security/             # WAF, rate limiting, CSRF, DDoS shield
│   ├── tenant/               # Multi-tenancy context (prepared)
│   └── webhooks/             # Dead-letter queue
└── ui/components/            # React components

docs/compliance/              # Security & compliance documentation
e2e/                          # Playwright E2E tests (11 specs)
k6/                           # Load testing (smoke/load/stress)
migrations/                   # PostgreSQL migrations (001-007)
```

---

## Testing & Quality

| Layer | Tool | Details |
|-------|------|---------|
| Unit | Vitest | 466+ tests, 80% coverage threshold enforced |
| E2E | Playwright | 11 specs (auth, a11y, SEO, rate limiting, checkout) |
| Load | k6 | Smoke/load/stress profiles with SLO thresholds |
| Security | ESLint Security + GitGuardian | Static analysis + secret scanning |

```bash
pnpm test:unit              # 466+ tests
pnpm test:unit --coverage   # With v8 coverage report
pnpm test:e2e               # Playwright (3 browsers locally)
pnpm lint                   # ESLint (zero warnings)
```

---

## Load Testing (k6)

```bash
# Install: brew install k6
k6 run k6/homepage.js                    # Single test
PROFILE=stress ./k6/run-all.sh           # Full stress suite
```

**SLO Thresholds** (enforced in CI):
- p95 response time < 500ms
- p99 response time < 1500ms
- Error rate < 1%

---

## CI/CD Pipeline

GitHub Actions on every PR and push to `main`:

```
Checkout → Install → Security Audit → Lint → Test (with coverage) → Upload
```

- Node 22, pnpm 10, frozen lockfile
- Minimal permissions (supply chain defense)
- GitGuardian secret scanning
- Semantic-release for automated versioning
- Vercel deployment on merge to `main`

---

## Compliance & Governance

| Framework | Status | Notes |
|-----------|--------|-------|
| GDPR/RGPD | Implemented | Consent flow, soft-delete, IP hashing, data portability |
| OWASP Top 10 | Mitigated | WAF, input validation, security headers, CSRF, SQLi prevention |
| Supply Chain | Hardened | `.npmrc`, frozen lockfile, integrity monitoring, Dependabot |
| Audit Trail | Persistent | PostgreSQL-backed audit log with structured JSON |
| Incident Response | Documented | [`docs/compliance/RANSOMWARE-DEFENSE.md`](docs/compliance/RANSOMWARE-DEFENSE.md) |

---

## Maturity Status

Honest assessment of what each capability can claim today.

| Capability | Maturity | What This Means |
|-----------|----------|-----------------|
| Ticket sales + Stripe | **Production** | Atomic transactions, capacity guards, webhook verification, idempotency |
| Lead capture + GDPR | **Production** | Working consent flow, soft-delete, IP hashing |
| Admin dashboard | **Production** | CRUD, audit log, system health |
| Security (WAF, rate limit, CSRF) | **Production** | Active on all routes, tested |
| CI/CD + testing | **Production** | 466+ tests, pre-commit hooks, automated releases |
| i18n | **Production** | Spanish/English, locale routing |
| Multi-tenancy | **Prepared** | Registry + provisioner + context exist. Runtime query scoping not active. |
| OpenTelemetry | **Prepared** | SDK ready. No instrumentation on routes or queries. |
| 2FA TOTP | **Prepared** | Library integrated. Not wired to login flow. |
| Encryption (AES-256-GCM) | **Prepared** | Utilities available. Not applied to stored data. |
| Dead-letter queue | **Prepared** | Events captured. No retry UI or reconciliation. |
| OpenAPI docs | **Partial** | 3 of ~15 endpoints documented. |
| Auto-refund (paid-but-expired) | **Designed** | Decision memo approved. Not implemented. |
| Reservation expiration | **Not implemented** | Reserved orders do not expire automatically. |

---

## Support & Contact

For licensing inquiries, custom integrations, or enterprise support:

**admin@claritystructures.com**

Clarity Structures Digital S.L. — Madrid, Spain

---

## License

Custom MIT License — see [LICENSE](./LICENSE) for full terms.

Permitted: use, modification, distribution for legitimate business purposes.
Restricted: use in systems designed to cause harm, unauthorized surveillance, or violation of privacy regulations.
