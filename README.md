```
 ___         _   _          _   ___  _      _    __
| __|__ ___ | |_(_)_ ____ _| | | _ \| |__ _| |_ / _|___ _ _ _ __
| _/ -_|_-<|  _| \ V / _` | | |  _/| / _` |  _|  _/ _ \ '_| '  \
|_|\___/__/ \__|_|\_/\__,_|_| |_|  |_\__,_|\__|_| \___/_| |_|_|_|

 Production-grade infrastructure for live music & electronic festivals
```

[![CI](https://github.com/Neiland85/festival-platform-template/actions/workflows/ci.yml/badge.svg)](https://github.com/Neiland85/festival-platform-template/actions)
[![Security](https://img.shields.io/badge/security-hardened-green)](docs/compliance/)
[![License](https://img.shields.io/badge/license-Custom%20MIT-blue)](#license)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Security Stack](#security-stack)
- [Features](#features)
- [Quick Start](#quick-start)
- [White-Label Customization](#white-label-customization)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Testing & Quality](#testing--quality)
- [Load Testing (k6)](#load-testing-k6)
- [CI/CD Pipeline](#cicd-pipeline)
- [Compliance & Governance](#compliance--governance)
- [Support & Contact](#support--contact)
- [License](#license)

---

## Overview

This is not a starter kit. It is a **production-grade platform** engineered for live music festivals, electronic music events, and concert operations.

Built over multiple iterations with the engineering depth of a six-figure SaaS product. Available as a white-label template with enterprise security, multi-tenancy, and regulatory compliance baked in.

**What this solves:**

- Ticket sales pipeline with Stripe, capacity validation, and idempotent order processing
- Lead capture with full GDPR/RGPD compliance (consent flow, soft-delete, data portability)
- Admin dashboard for event management, orders, leads, and real-time system health
- Multi-tenant architecture for agencies managing multiple festival brands
- Enterprise observability: metrics, tracing, audit logging, surge prediction

**Stack:** Next.js 15 (App Router) / React 19 / TypeScript 5 (strict) / Tailwind 4 / PostgreSQL / Drizzle ORM / Stripe / Upstash Redis / Sentry / Sanity CMS

---

## Architecture

```
                          INTERNET
                             |
                    [Vercel Edge Network]
                             |
              +--------------+--------------+
              |         MIDDLEWARE           |
              |  WAF / Rate Limit / CORS    |
              |  DDoS Shield / Auth         |
              |  Tenant Resolution          |
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
              |  OpenTelemetry / Metrics    |
              |  Audit Log / Request Tracer |
              |  Correlation Engine         |
              +--------------+--------------+
```

**Design principles:**

- **Graceful degradation** — every external service is optional with local fallback
- **Defense in depth** — security at every layer (edge, middleware, application, data)
- **Schema-level multi-tenancy** — PostgreSQL schema isolation per tenant
- **Adapter pattern** — swappable integrations without touching domain logic

---

## Security Stack

This platform implements a comprehensive security posture across 8 categories.

| Layer | Implementation |
|-------|---------------|
| **Web Application Firewall** | 70+ attack patterns: SQLi, XSS, path traversal, command injection, protocol smuggling, SSRF |
| **DDoS Shield** | Multi-layer: connection limiting, request throttling, payload validation, slowloris protection, geographic filtering |
| **Rate Limiting** | Redis-backed sliding window (distributed), IP-based, endpoint-specific (stricter on auth) |
| **Authentication** | bcrypt hashed passwords, HMAC-SHA256 sessions, 2FA TOTP support, session rotation |
| **Encryption** | AES-256-GCM for data at rest, TLS 1.3 in transit, HSTS + CSP security headers |
| **CSRF Protection** | Mandatory in production, timing-safe token comparison, deny-by-default |
| **Supply Chain** | `.npmrc` hardened, `pnpm audit` in CI, frozen lockfile, Dependabot, integrity monitoring |
| **Privacy** | GDPR/RGPD compliant: IP hashing (SHA-256), soft-delete, consent tracking, data portability |

Full documentation: [`docs/compliance/`](docs/compliance/)

---

## Features

### Core Platform

- **Event lineup** with detail pages, ticket integration, and OG metadata
- **Stripe Checkout** with webhooks, capacity validation, dead-letter queue for failed events
- **Lead capture** with GDPR consent flow, soft-delete, and data export
- **Admin dashboard** with event CRUD, leads, orders, system health, and audit trail
- **i18n** with `next-intl` (ES/EN out of the box)
- **Sanity CMS** (optional) for content management at `/studio`
- **OpenAPI 3.1** auto-generated API documentation at `/api/docs`

 Ship your festival website in days, not months.
```

[![CI](https://github.com/Neiland85/festival-platform-template/actions/workflows/ci.yml/badge.svg)](https://github.com/Neiland85/festival-platform-template/actions)
[![Tests](https://img.shields.io/badge/tests-466%2B%20passing-brightgreen)](#testing--quality)
[![License](https://img.shields.io/badge/license-Custom%20MIT-blue)](#license)

---

## Why This Exists

Building a festival website with real ticket sales, GDPR compliance, and production security takes months. This template gives you that foundation in days.

**What you get:** A white-label Next.js 15 platform with Stripe payments, admin dashboard, lead capture, and hardened security — tested with 466+ automated tests and deployed on Vercel.

**Who it's for:** Festival operators, event agencies, and developers who need a working product, not a tutorial.

**Stack:** Next.js 15 · React 19 · TypeScript 5 (strict) · Tailwind 3.4 · PostgreSQL 15 · Drizzle ORM · Stripe · Redis · Sentry · Sanity CMS

---

## What You Get Out of the Box

### Ticket Sales with Stripe

Every optional feature works independently. The platform runs with **zero external services**:

| Feature | Configured | Not configured |
|---------|-----------|----------------|
| Sanity CMS | Events from CMS with localized fields | Falls back to `src/config/events.ts` |
| Stripe | Native ticket checkout with webhooks | Falls back to Ticketmaster/Universe links |
| PostgreSQL | Full CRUD, orders, leads | Falls back to config file |
| Redis | Distributed rate limiting + circuit breaker | In-memory rate limiting |
| Sentry | Error tracking + performance | Silent |
| OpenTelemetry | Distributed tracing to Jaeger/Grafana | Custom in-memory observability |
Stripe Checkout integration with atomic capacity reservation. When two customers try to buy the last ticket simultaneously, only one succeeds — guaranteed by PostgreSQL transactions with row-level locking. Webhook verification with dual-layer idempotency ensures every payment is processed exactly once. Failed webhook events are captured in a dead-letter queue for manual review.

### Lead Capture with GDPR Compliance

Consent-first lead capture with soft-delete, IP hashing (SHA-256 for GDPR), and data portability. Leads are never permanently deleted — they're anonymized and recoverable for audit purposes.

### Admin Dashboard

**Prerequisites:** Node 22+, pnpm, Docker.

```bash
git clone <your-repo-url>
cd festival-platform-template
pnpm install
pnpm setup      # Docker + DB + schema + seed (~30s)
pnpm dev        # http://localhost:3000
```

Admin dashboard: `/dashboard` (password from `ADMIN_PASSWORD` in `.env.local`).
Event management, lead pipeline, order tracking, system health monitoring, and a persistent audit log backed by PostgreSQL. Every admin action is recorded with who, when, what, and from where.

### Security

| Layer | What It Does |
|-------|-------------|
| **WAF** | Blocks 70+ attack patterns (SQLi, XSS, path traversal, command injection, SSRF) |
| **Rate Limiting** | Redis-backed sliding window with in-memory fallback. Stricter limits on auth endpoints |
| **CSRF** | Mandatory in production. Timing-safe token comparison. Deny-by-default |
| **Authentication** | bcrypt-hashed passwords, HMAC-SHA256 session tokens, session rotation |
| **Headers** | HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options |
| **DDoS Shield** | Connection limiting, request throttling, payload validation, slowloris protection |
| **Supply Chain** | Hardened `.npmrc`, frozen lockfile, `pnpm audit` in CI, Dependabot, integrity monitoring |
| **Privacy** | GDPR/RGPD: IP hashing, soft-delete, consent tracking, data portability |

### Automated Testing & CI/CD

1. Copies `.env.example` to `.env.local` (skips if exists)
2. Starts PostgreSQL 15 via Docker Compose
3. Waits for healthy status
4. Pushes Drizzle schema
5. Seeds demo data (7 events, 3 users, 8 leads, 10 orders)

Clean slate: `docker compose down -v && pnpm setup`
466+ unit tests (Vitest), 11 E2E specs (Playwright), load testing (k6), and security scanning (ESLint Security + GitGuardian). 80% coverage threshold enforced. Husky pre-commit hooks run lint + tests on every commit. Semantic-release publishes versions automatically on merge.

### Graceful Degradation

Core flows run with PostgreSQL only. Optional services such as Redis and OpenTelemetry degrade gracefully when unavailable:

| Service | With it | Without it |
|---------|---------|------------|
| Stripe | Native checkout with webhooks | Falls back to Ticketmaster/external links |
| Sanity CMS | Content management at `/studio` | Events from config file |
| Redis | Distributed rate limiting + circuit breaker | In-memory rate limiting |
| Sentry | Error tracking + performance | Structured JSON logs to stdout |

### Branding
### White-Label in Minutes

All branding lives in one file (`src/config/site.ts`) and environment variables. Change the name, logo, colors, and content — deploy your own festival site without touching application code.

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
---

## What's Prepared for Future Activation

These modules are built and tested but not yet wired to runtime paths. They're ready to activate when your product needs them.

| Module | What's Built | What's Needed to Activate |
|--------|-------------|--------------------------|
| **Multi-tenancy** | Tenant registry (PostgreSQL), schema provisioner, request-scoped context via AsyncLocalStorage | Runtime tenant query scoping pending before isolation is active. |
| **OpenTelemetry** | SDK initialization with OTLP HTTP exporter, Next.js instrumentation hook | Route and query instrumentation — wrapping handlers with `tracer.startActiveSpan()`. |
| **2FA (TOTP)** | Secret generation, QR code URI, token verification | User enrollment endpoint, login flow integration, recovery codes, database column for secrets. |
| **Encryption at rest** | AES-256-GCM encrypt/decrypt with Web Crypto API | Decision on which data to encrypt, repository integration, key rotation strategy. |
| **Webhook auto-recovery** | Dead-letter queue captures failed Stripe events in PostgreSQL | Automated retry and reconciliation pending. |
| **API documentation** | OpenAPI 3.1 spec at `/api/docs` (auth, checkout, health) | Coverage for remaining ~12 endpoints, response schemas, validation middleware. |

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
              |  WAF / Security Headers     |
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
```

**Design principles:**

- **Graceful degradation** — every external service is optional with local fallback
- **Defense in depth** — security at edge, middleware, application, and data layers
- **Adapter pattern** — swappable integrations without touching domain logic
- **Atomic state transitions** — PostgreSQL transactions with status guards prevent overselling

---

## Quick Start

**Prerequisites:** Node 22+, pnpm, Docker.

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
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry | Distributed tracing |
```bash
git clone <your-repo-url>
cd festival-platform-template
pnpm install
pnpm setup      # Docker + DB + schema + seed (~30s)
pnpm dev        # http://localhost:3000
```

Admin dashboard: `/dashboard` (password from `ADMIN_PASSWORD` in `.env.local`).

Clean slate: `docker compose down -v && pnpm setup`

---

## White-Label Customization

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
│   ├── api/docs/             # OpenAPI 3.1 spec (auto-generated)
│   └── dashboard/            # Admin panel
├── config/                   # White-label configuration
├── contracts/schemas/        # Zod validation schemas
├── domain/                   # Business logic (events, orders, leads)
├── lib/
│   ├── auth/                 # Authentication, RBAC, TOTP
│   ├── crypto/               # AES-256-GCM encryption
│   ├── observability/        # OTEL, metrics, audit, tracing
│   ├── security/             # WAF, rate limiting, CSRF, DDoS shield
│   ├── tenant/               # Multi-tenancy (schema isolation)
│   └── webhooks/             # Dead-letter queue
└── ui/components/            # React components

docs/compliance/              # Security & compliance documentation
e2e/                          # Playwright E2E tests (11 specs)
k6/                           # Load testing (smoke/load/stress)
migrations/                   # PostgreSQL migrations (001-007)
```
| What to change | Where |
|---------------|-------|
| Festival name | `NEXT_PUBLIC_SITE_NAME` in `.env.local` |
| Site URL | `NEXT_PUBLIC_SITE_URL` in `.env.local` |
| Logo | Replace `/public/festival_logo.png` |
| Hero video | Replace `/public/hero/hero.mp4` |
| Colors | CSS variables in `src/app/globals.css` |
| Events | `src/config/events.ts` or Sanity CMS |
| Translations | `messages/es.json` and `messages/en.json` |

### Payment Priority

## Testing & Quality

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | 465+ tests, 80% threshold enforced |
| E2E | Playwright | 11 specs (auth, a11y, SEO, rate limiting, checkout) |
| Load | k6 | Smoke/load/stress profiles with SLO thresholds |
| Security | ESLint Security + GitGuardian | Static analysis + secret scanning |
| Coverage | Codecov | Historical tracking + PR comments |

```bash
pnpm test:unit          # 465+ tests
pnpm test:unit --coverage   # With v8 coverage report
pnpm test:e2e           # Playwright (3 browsers locally)
pnpm lint               # ESLint (zero warnings)
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

```
1. Stripe      → Event has price + STRIPE_SECRET_KEY set
2. Ticketmaster → Event has ticketUrl
3. Coming soon  → Neither configured
```

---

## Environment Variables

See `.env.example` for complete reference.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ADMIN_PASSWORD` | Dashboard password (bcrypt hashed in production) |
| `SESSION_SECRET` | 32+ character secret (`openssl rand -hex 32`) |

### Optional

| Variable | Enables |
|----------|---------|
| `STRIPE_SECRET_KEY` | Native ticket checkout |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | CMS at `/studio` |
| `SENTRY_DSN` | Error tracking |
| `REDIS_URL` | Distributed rate limiting |

---

## Testing & Quality

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | 466+ tests, 80% threshold enforced |
| E2E | Playwright | 11 specs across 3 browsers |
| Load | k6 | SLO: p95 < 500ms, p99 < 1500ms, errors < 1% |
| Security | ESLint Security + GitGuardian | Static analysis + secret scanning |

```bash
pnpm test:unit              # Unit tests
pnpm test:unit --coverage   # With coverage report
pnpm test:e2e               # E2E (Chromium, Firefox, Mobile Chrome)
pnpm lint                   # Zero warnings policy
```

---

## CI/CD Pipeline

GitHub Actions on every PR and push to `main`:

```
Checkout → Install → Security Audit → Lint → Test (with coverage) → Codecov Upload
```

- Node 22, pnpm 10, frozen lockfile
- Minimal permissions (ransomware defense)
- GitGuardian secret scanning
- Semantic-release for automated versioning
- Vercel deployment on merge to `main`

---

## Compliance & Governance

| Framework | Status | Documentation |
|-----------|--------|---------------|
| GDPR/RGPD | Implemented | Consent flow, soft-delete, IP hashing, data portability |
| OWASP Top 10 | Mitigated | WAF, input validation, security headers, CSRF, SQLi prevention |
| Supply Chain | Hardened | `.npmrc`, frozen lockfile, integrity monitoring, Dependabot |
| Audit Trail | Persistent | PostgreSQL-backed audit log with structured JSON |
| Incident Response | Documented | [`docs/compliance/RANSOMWARE-DEFENSE.md`](docs/compliance/RANSOMWARE-DEFENSE.md) |
| DDoS Mitigation | Multi-layer | Connection, request, payload, and geographic defenses |

---

## Support & Contact

For licensing inquiries, custom integrations, or enterprise support:

**admin@claritystructures.com**
Every push and PR triggers:

```
Checkout → Install → Security Audit → Lint → Test + Coverage → Deploy
```

Node 22, pnpm 10, frozen lockfile, minimal CI permissions, GitGuardian scanning, semantic-release versioning, Vercel auto-deploy.

---

## Compliance

| Framework | Status |
|-----------|--------|
| GDPR/RGPD | Consent flow, soft-delete, IP hashing, data portability |
| OWASP Top 10 | WAF, input validation, security headers, CSRF, SQLi prevention |
| Supply Chain | Hardened `.npmrc`, frozen lockfile, integrity monitoring |
| Audit Trail | PostgreSQL-backed, structured JSON, tamper-evident |
| Incident Response | [Documented playbook](docs/compliance/RANSOMWARE-DEFENSE.md) |

---

## Maturity Status

| Capability | Status | Details |
|-----------|--------|---------|
| Stripe payments | **Production** | Atomic capacity reservation, webhook verification, idempotency, dead-letter queue |
| Lead capture | **Production** | GDPR consent, soft-delete, IP hashing, data portability |
| Admin dashboard | **Production** | CRUD, persistent audit log, system health |
| Security | **Production** | WAF, rate limiting, CSRF, bcrypt, headers, DDoS, supply chain, privacy |
| CI/CD + testing | **Production** | 466+ tests, pre-commit hooks, semantic versioning, auto-deploy |
| i18n | **Production** | ES/EN with locale-aware routing |
| Multi-tenancy | **Prepared** | Schema provisioning and context propagation built. Query scoping activation pending. |
| Custom observability | **Production** | Per-route metrics, persistent audit log, request tracing, correlation engine, surge prediction |
| OpenTelemetry tracing | **Prepared** | SDK initialized with OTLP HTTP exporter. Route and query instrumentation pending. |
| Webhook resilience | **Production + Pending** | Failed events captured in dead-letter queue today. Automated retry and reconciliation still pending. |
| 2FA (TOTP) | **Prepared** | Verification library integrated. Login flow and user enrollment pending. |
| Encryption at rest | **Prepared** | AES-256-GCM utilities available. Not yet applied to stored data. |
| API documentation | **Partial** | OpenAPI 3.1 spec covers core endpoints. Full coverage in progress. |

---

## Support & Contact

Licensing, custom integrations, and enterprise support:

**admin@claritystructures.com**

Clarity Structures Digital S.L. — Madrid, Spain

---

## License

Custom MIT License — see [LICENSE](./LICENSE) for full terms.

Permitted: use, modification, distribution for legitimate business purposes.
Restricted: use in systems designed to cause harm, unauthorized surveillance, or violation of privacy regulations.
Custom MIT License — see [LICENSE](./LICENSE).

Permitted for legitimate business use, modification, and distribution.
Restricted for harmful, surveillance, or privacy-violating applications.
