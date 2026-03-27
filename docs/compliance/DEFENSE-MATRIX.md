# Comprehensive Defense Matrix — Hacking Mitigation System

> Maps every known attack vector to our implemented defense
> Last updated: 2026-03-27 | Festival Platform Template v1.5+

## Defense Architecture

```
INTERNET ──► VERCEL EDGE ──► MIDDLEWARE ──► ROUTE HANDLERS ──► DATABASE
              (L3/L4)        (L7 Shield)    (App Security)    (Data Layer)
```

## 1. Network Layer Attacks (L3/L4)

| Attack | Description | Defense | Status |
|--------|-------------|---------|--------|
| SYN Flood | Overwhelm TCP handshake | Vercel Edge infra | Delegated |
| UDP Flood | Volumetric UDP packets | N/A (HTTP only) | N/A |
| ICMP Flood | Ping of death | Vercel Edge infra | Delegated |
| IP Spoofing | Forged source addresses | Vercel Edge + reverse proxy | Delegated |
| BGP Hijacking | Route manipulation | DNS provider (Vercel) | Delegated |

## 2. Transport Layer Attacks (L4)

| Attack | Defense | Implementation |
|--------|---------|---------------|
| TLS Downgrade | HSTS preload (2yr) | `next.config.ts` |
| BEAST/POODLE | TLS 1.3 enforced | Vercel Edge |
| Connection Exhaust | Pool max 3/instance | `pool.ts` |
| Slow Read | Idle timeout 4s | `pool.ts` |
| SSL Stripping | `upgrade-insecure-requests` | CSP header |

## 3. Application Layer Attacks (L7)

### 3.1 Injection Attacks

| Attack | Defense | File |
|--------|---------|------|
| SQL Injection | Drizzle ORM (parameterized) + Zod validation | `drizzle.ts`, `schemas/` |
| XSS (Stored) | React auto-escaping + CSP | `next.config.ts` |
| XSS (Reflected) | `X-Content-Type-Options: nosniff` | `next.config.ts` |
| XSS (DOM) | No `dangerouslySetInnerHTML` (removed) | `ShowcaseFooter.tsx` |
| CSRF | HMAC-SHA256 tokens + SameSite cookies | `verifyCsrf.ts` |
| Command Injection | No shell exec in codebase | Architecture |
| LDAP Injection | No LDAP in stack | N/A |
| XML/XXE | No XML parsing | N/A |
| SSRF | No user-controlled URLs fetched | Architecture |
| Template Injection | React JSX (no string templates) | Architecture |

### 3.2 Authentication Attacks

| Attack | Defense | File |
|--------|---------|------|
| Brute Force | 5 attempts/60s + auto-ban | `loginRateLimit.ts`, `ddos-shield.ts` |
| Credential Stuffing | bcrypt hashing + rate limit | `login/route.ts` |
| Session Hijacking | HMAC-SHA256 signed + httpOnly | `signedSession.ts` |
| Session Fixation | New token on each login | `sessionStore.ts` |
| Password Spraying | IP-based rate limiting | `ddos-shield.ts` |
| Token Replay | `iat`/`exp` claims + max age | `signedSession.ts` |
| Timing Attack | `crypto.timingSafeEqual` | `signedSession.ts`, `verifyCsrf.ts` |

### 3.3 DDoS / Availability Attacks

| Attack | Defense | File |
|--------|---------|------|
| HTTP Flood | 60 req/min per IP (global) | `ddos-shield.ts` |
| POST Flood | Body size limits (1KB-64KB) | `ddos-shield.ts` |
| Slowloris | Header validation + limits | `ddos-shield.ts` |
| Header Bomb | UA > 1KB / > 50 headers blocked | `ddos-shield.ts` |
| Cache Bust | Referer > 2KB blocked | `ddos-shield.ts` |
| ReDoS | eslint-plugin-security | `eslint.config.mjs` |
| Zip Bomb | No file upload/decompression | N/A |
| Hash DoS | No user-controlled hash keys | Architecture |
| Queue Flood | Backpressure (1K max) | `queueFacade.ts` |
| DB Exhaust | Connection pool (max 3) | `pool.ts` |

### 3.4 Privacy / Information Disclosure

| Attack | Defense | File |
|--------|---------|------|
| IP Exposure | SHA256 hashing | `hashIp.ts` |
| Server Fingerprint | X-Powered-By stripped | `privacy-shield.ts` |
| Error Disclosure | Generic error messages | `safeHandler.ts` |
| Directory Traversal | Next.js file routing (no user paths) | Architecture |
| Source Map Leak | Deleted after upload | `next.config.ts` |
| API Enumeration | Auth + rate limit on all routes | `middleware.ts` |
| Browser Fingerprint | 17 APIs disabled (Permissions-Policy) | `next.config.ts` |
| DNS Leak | X-DNS-Prefetch-Control: off | `next.config.ts` |
| Tracking (FLoC) | browsing-topics=() | `next.config.ts` |
| Referrer Leak | strict-origin-when-cross-origin | `next.config.ts` |
| Cache Snooping | no-store on API responses | `middleware.ts` |
| CORS Misconfiguration | Explicit allowlist | `next.config.ts` |

### 3.5 Business Logic Attacks

| Attack | Defense | File |
|--------|---------|------|
| Double Spending | Idempotency keys (Redis + local) | `idempotency.ts` |
| Race Condition | Domain-level idempotency checks | `enforced-idempotency.ts` |
| Price Manipulation | Server-side pricing (Stripe) | `checkout.ts` |
| Webhook Replay | Stripe event ID dedup | `webhooks.ts` |
| Inventory Exhaust | Capacity check before checkout | `checkout/route.ts` |

### 3.6 Supply Chain Attacks

| Attack | Defense | File |
|--------|---------|------|
| Dependency Hijacking | pnpm lockfile + frozen install | `pnpm-lock.yaml` |
| Known CVEs | Dependabot + pnpm overrides | `package.json` |
| Typosquatting | Exact version pinning | `package.json` |
| Build Pipeline | GitHub Actions (official actions) | `.github/workflows/` |
| Secret Exposure | .gitignore + env validation | `.gitignore`, `env.ts` |

## 4. Compliance Defense Layer

| Regulation | Requirement | Our Defense |
|-----------|------------|-------------|
| GDPR Art. 32 | Security of processing | TLS, bcrypt, RBAC, DDoS shield |
| GDPR Art. 33 | Breach notification (72h) | Audit logs, surge detection |
| GDPR Art. 35 | DPIA | `docs/compliance/DPIA.md` |
| NIS2 | Incident reporting | Structured logging, Sentry |
| LOPDGDD | Spanish data protection | Privacy policy, ARCO rights |
| PCI DSS | Payment security | Stripe (delegated) |
| ePrivacy | Cookie consent | CookieBanner (accept/reject) |

## 5. Monitoring & Detection

| System | Purpose | File |
|--------|---------|------|
| Audit Log | Who did what, when, from where | `auditLog.ts` |
| Surge Predictor | Traffic spike detection | `surgePredictor.ts` |
| Correlation Engine | Multi-signal attack detection | `correlationEngine.ts` |
| Request Tracer | Per-request latency + errors | `requestTracer.ts` |
| Circuit Breaker | Redis failure detection | `circuit-breaker.ts` |
| Sentry | Runtime error tracking | `next.config.ts` |
| k6 Load Tests | Performance under attack | `k6/` |

## 6. Total Coverage

| Category | Attacks Covered | Status |
|----------|----------------|--------|
| Network (L3/L4) | 5 | Delegated to Vercel |
| Transport (L4) | 5 | Implemented |
| Injection | 11 | Implemented |
| Authentication | 7 | Implemented |
| DDoS/Availability | 10 | Implemented |
| Privacy/Disclosure | 12 | Implemented |
| Business Logic | 5 | Implemented |
| Supply Chain | 5 | Implemented |
| **TOTAL** | **60 attack vectors** | **All covered** |
