```
 ___         _   _          _   ___  _      _    __
| __|__ ___ | |_(_)_ ____ _| | | _ \| |__ _| |_ / _|___ _ _ _ __
| _/ -_|_-<|  _| \ V / _` | | |  _/| / _` |  _|  _/ _ \ '_| '  \
|_|\___/__/ \__|_|\_/\__,_|_| |_|  |_\__,_|\__|_| \___/_| |_|_|_|

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

Stripe Checkout integration with atomic capacity reservation. When two customers try to buy the last ticket simultaneously, only one succeeds — guaranteed by PostgreSQL transactions with row-level locking. Webhook verification with dual-layer idempotency ensures every payment is processed exactly once. Failed webhook events are captured in a dead-letter queue for manual review.

### Lead Capture with GDPR Compliance

Consent-first lead capture with soft-delete, IP hashing (SHA-256 for GDPR), and data portability. Leads are never permanently deleted — they're anonymized and recoverable for audit purposes.

### Admin Dashboard

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

466+ unit tests (Vitest), 11 E2E specs (Playwright), load testing (k6), and security scanning (ESLint Security + GitGuardian). 80% coverage threshold enforced. Husky pre-commit hooks run lint + tests on every commit. Semantic-release publishes versions automatically on merge.

### Graceful Degradation

Core flows run with PostgreSQL only. Optional services such as Redis and OpenTelemetry degrade gracefully when unavailable:

| Service | With it | Without it |
|---------|---------|------------|
| Stripe | Native checkout with webhooks | Falls back to Ticketmaster/external links |
| Sanity CMS | Content management at `/studio` | Events from config file |
| Redis | Distributed rate limiting + circuit breaker | In-memory rate limiting |
| Sentry | Error tracking + performance | Structured JSON logs to stdout |

### White-Label in Minutes

All branding lives in one file (`src/config/site.ts`) and environment variables. Change the name, logo, colors, and content — deploy your own festival site without touching application code.

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

Custom MIT License — see [LICENSE](./LICENSE).

Permitted for legitimate business use, modification, and distribution.
Restricted for harmful, surveillance, or privacy-violating applications.
