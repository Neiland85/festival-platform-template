# Data Protection Impact Assessment (DPIA)

> GDPR Article 35 | LOPDGDD Art. 28
> Last updated: 2026-03-27 | Festival Platform Template v1.5+

## 1. Assessment Overview

| Field | Value |
|-------|-------|
| **Project** | Festival Platform Template |
| **Controller** | [Data controller as configured in CONTACT_EMAIL] |
| **DPO Contact** | [Designated DPO email or AEPD reference] |
| **Assessment Date** | 2026-03-27 |
| **Review Date** | 2026-09-27 (6-month cycle) |
| **Legal Basis** | GDPR Art. 6.1.a (consent), 6.1.b (contract), 6.1.f (legitimate interest) |

## 2. Processing Activities

### 2.1 Lead Capture (Email/Contact Collection)

| Aspect | Detail |
|--------|--------|
| **Data collected** | Email, name, surname, phone, profession |
| **Purpose** | Event marketing, ticket sales, communications |
| **Legal basis** | Explicit consent (Art. 6.1.a) via checkbox |
| **Retention** | 12 months from collection |
| **Storage** | PostgreSQL (Neon) with TLS encryption |
| **Access** | Admin users only (RBAC-protected) |
| **Deletion** | Soft-delete (preserves audit trail), full purge available |

### 2.2 Payment Processing

| Aspect | Detail |
|--------|--------|
| **Data collected** | Payment intent (via Stripe — card data never touches our servers) |
| **Purpose** | Ticket purchase fulfillment |
| **Legal basis** | Contractual necessity (Art. 6.1.b) |
| **Retention** | 5 years (Spanish tax law obligation) |
| **Processor** | Stripe Inc. (PCI DSS Level 1 certified) |
| **Access** | Stripe dashboard only; our system stores order IDs |

### 2.3 Analytics & Cookies

| Aspect | Detail |
|--------|--------|
| **Data collected** | Page views, session data, anonymized interactions |
| **Purpose** | Website improvement, conversion tracking |
| **Legal basis** | Consent (Art. 6.1.a) via cookie banner |
| **Retention** | 180 days (cookie), 26 months (Google Analytics) |
| **Opt-out** | Cookie banner with reject option |
| **Processors** | Google Analytics (optional), Meta Pixel (optional) |

### 2.4 Admin Authentication & Audit

| Aspect | Detail |
|--------|--------|
| **Data collected** | Hashed IP address, session tokens, action logs |
| **Purpose** | Security, access control, compliance audit trail |
| **Legal basis** | Legitimate interest (Art. 6.1.f) |
| **Retention** | In-memory: 1000 entries; PostgreSQL: indefinite |
| **IP handling** | SHA256 hashed — raw IPs never persisted |

## 3. Risk Assessment

### 3.1 Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
|------|-----------|--------|------------|---------------|
| **Data breach** | Low | High | TLS, bcrypt, RBAC, DDoS shield, rate limiting | Low |
| **Unauthorized access** | Low | High | Middleware auth, session HMAC-SHA256, auto-ban | Low |
| **Data loss** | Very Low | Medium | PostgreSQL backups (Neon), soft-delete | Very Low |
| **Consent violation** | Low | High | Cookie banner, consent flag in DB, audit log | Low |
| **Cross-border transfer** | Medium | Medium | Vercel (US/EU), Stripe (US with SCCs) | Medium |
| **Profiling** | Very Low | Low | No automated decision-making | Very Low |
| **IP address exposure** | Very Low | Medium | hashIp() — never stores raw IPs | Very Low |
| **Third-party data leak** | Low | Medium | Minimal data shared, encrypted transit | Low |

### 3.2 Technical Controls

| Control | Implementation | GDPR Article |
|---------|---------------|-------------|
| Encryption at rest | PostgreSQL TLS + Neon encryption | Art. 32.1.a |
| Encryption in transit | HSTS + TLS 1.3 + CSP upgrade-insecure | Art. 32.1.a |
| Pseudonymization | hashIp() for all IP addresses | Art. 32.1.a |
| Access control | RBAC (admin/editor/viewer) + middleware | Art. 32.1.b |
| Resilience | Circuit breaker, graceful degradation, chaos testing | Art. 32.1.b |
| Availability | Vercel edge CDN, PostgreSQL replicas | Art. 32.1.b |
| Regular testing | 390 unit tests, E2E tests, k6 load tests | Art. 32.1.d |
| Incident detection | Audit logs, surge predictor, correlation engine | Art. 33 |
| Data minimization | Only collect necessary fields | Art. 5.1.c |
| Purpose limitation | Clear purposes per processing activity | Art. 5.1.b |

### 3.3 Organizational Controls

| Control | Status |
|---------|--------|
| Privacy policy | Published at /privacidad |
| Cookie policy | Integrated in privacy policy + banner |
| Data processing agreements | Required with Stripe, Neon, Vercel |
| Staff training | Recommended for admin users |
| Incident response plan | 72-hour AEPD notification obligation |
| Regular DPIA reviews | 6-month review cycle |

## 4. Data Flows

```
                        ┌─────────────┐
                        │   End User  │
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │    Vercel Edge CDN   │  TLS termination
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Next.js Middleware │  DDoS + Privacy Shield
                    │   (IP never stored  │  IP hashed for rate limit
                    │    in raw form)     │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼───────┐ ┌─────▼──────┐ ┌───────▼──────┐
     │ Lead Capture   │ │ Checkout   │ │ Admin APIs   │
     │ (consent req.) │ │ (Stripe)   │ │ (auth req.)  │
     └────────┬───────┘ └─────┬──────┘ └───────┬──────┘
              │               │                │
     ┌────────▼───────────────▼────────────────▼──────┐
     │              PostgreSQL (Neon)                   │
     │    TLS encrypted | Hashed IPs | Soft-delete     │
     └────────────────────────────────────────────────┘
```

## 5. Third-Party Processors

| Processor | Data Shared | Purpose | Safeguards |
|-----------|------------|---------|------------|
| **Stripe** | Order ID, amount | Payment processing | PCI DSS L1, SCCs |
| **Neon** | All application data | Database hosting | TLS, EU region available |
| **Vercel** | Request metadata | Hosting & CDN | SOC 2, GDPR DPA |
| **Sentry** | Error traces (no PII) | Error monitoring | EU data residency option |
| **Upstash** | Rate limit keys (hashed IPs) | Distributed rate limiting | TLS, EU region |
| **Google** | Anonymized analytics | Website analytics | Consent-gated, opt-out |
| **Meta** | Pixel events | Conversion tracking | Consent-gated, opt-out |
| **Sanity** | CMS content (no PII) | Content management | GDPR compliant |

## 6. Data Subject Rights Implementation

| Right | GDPR Art. | Implementation |
|-------|----------|---------------|
| **Access** | 15 | Admin can export lead data as JSON |
| **Rectification** | 16 | Admin can edit lead records |
| **Erasure** | 17 | Soft-delete + full purge capability |
| **Restriction** | 18 | Lead status can be changed to inactive |
| **Portability** | 20 | JSON export of all personal data |
| **Object** | 21 | Unsubscribe + consent revocation |
| **Automated decisions** | 22 | No automated profiling implemented |

## 7. ICANN/ALAC Compliance

### Domain Registration Data
- ICANN Registration Data Policy (effective Aug 2025)
- Admin/billing contacts: no longer mandatory
- Technical contact: optional
- Registrant data: accurate and current (7-day update window)

### ALAC Recommendations
- End-user privacy prioritized in domain registration
- WHOIS data redacted by default (GDPR alignment)
- Legitimate access procedures for law enforcement

## 8. Review Schedule

| Review | Frequency | Responsible |
|--------|-----------|-------------|
| DPIA full review | Every 6 months | DPO / Data Controller |
| Technical controls audit | Every 3 months | Engineering team |
| Third-party processor review | Annually | Legal / DPO |
| Incident response drill | Annually | Security team |
| Privacy policy update | On material changes | Legal |

## 9. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Data Controller | _________________ | ____/____/____ | ___________ |
| DPO | _________________ | ____/____/____ | ___________ |
| Engineering Lead | _________________ | ____/____/____ | ___________ |
| Legal Counsel | _________________ | ____/____/____ | ___________ |
