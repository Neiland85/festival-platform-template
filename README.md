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

### Graceful Degradation

Every optional feature works independently. The platform runs with **zero external services**:

| Feature | Configured | Not configured |
|---------|-----------|----------------|
| Sanity CMS | Events from CMS with localized fields | Falls back to `src/config/events.ts` |
| Stripe | Native ticket checkout with webhooks | Falls back to Ticketmaster/Universe links |
| PostgreSQL | Full CRUD, orders, leads | Falls back to config file |
| Redis | Distributed rate limiting + circuit breaker | In-memory rate limiting |
| Sentry | Error tracking + performance | Silent |
| OpenTelemetry | Distributed tracing to Jaeger/Grafana | Custom in-memory observability |

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
5. Seeds demo data (7 events, 3 users, 8 leads, 10 orders)

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
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry | Distributed tracing |

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

---

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

---

## License

Custom MIT License — see [LICENSE](./LICENSE) for full terms.

Permitted: use, modification, distribution for legitimate business purposes.
Restricted: use in systems designed to cause harm, unauthorized surveillance, or violation of privacy regulations.
