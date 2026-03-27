# Audit Plan — Festival Platform Template

> Comprehensive data traceability and compliance audit framework.
> Designed for instant official audits (GDPR/DPiA, ICANN/ALAC, ENS).

## 1. Audit Scope

| Layer | What is audited | Tool / Mechanism |
|-------|----------------|-----------------|
| Authentication | Login attempts, 2FA setup/verify, session lifecycle | `audit_events` table |
| Authorization | RBAC role checks, admin endpoint access | Middleware + audit log |
| Data Access | Lead reads, exports, modifications | Repository-level logging |
| Payments | Checkout sessions, webhook events, DLQ | Stripe + `webhook_dead_letters` |
| Infrastructure | Rate limiting events, WAF blocks, circuit breaker state | Structured JSON logs |
| Tenant Management | Schema creation, tenant config changes | `tenants` table + audit log |

## 2. Audit Event Structure

Every auditable action produces a structured event:

```json
{
  "timestamp": "2026-03-27T12:00:00.000Z",
  "level": "audit",
  "action": "admin.login",
  "actor": "admin",
  "ip": "sha256:a1b2c3...",
  "resource": "session:abc123",
  "details": {
    "method": "password+totp",
    "success": true
  },
  "requestId": "req-mn8g9o1c-qzidl8",
  "seq": 42
}
```

## 3. Data Retention

| Data Type | Retention | Justification |
|-----------|-----------|--------------|
| Audit events (DB) | 7 years | Spanish Commercial Code Art. 30 |
| Structured logs (stdout) | 90 days | Operational + compliance |
| WAF block logs | 30 days | Security incident analysis |
| TOTP secrets (encrypted) | Until 2FA disabled | User account lifecycle |
| Payment records | 10 years | Spanish Tax Law |

## 4. GDPR Compliance

### Data Protection by Design (Art. 25)
- IP addresses are SHA-256 hashed before storage (irreversible)
- TOTP secrets encrypted with AES-256-GCM at rest
- Session tokens use HMAC-SHA256 (no PII in cookies)
- Leads support soft-delete with consent tracking

### Data Subject Rights (Art. 15-22)
- Export: `/api/admin/leads?export=csv` with audit trail
- Deletion: Soft-delete with `deleted_at` timestamp
- Portability: JSON export available via admin dashboard

### Data Protection Impact Assessment (DPiA)
- Required for: bulk lead processing, payment data handling
- Template: See `docs/compliance/DPIA-TEMPLATE.md`
- Review cycle: Annually or on significant processing changes

## 5. Audit Trail Integrity

### Tamper Detection
- Audit events include sequential `seq` counter per process
- Gap detection: missing sequence numbers indicate tampering
- PostgreSQL-persisted events cannot be modified without DB access audit

### Chain of Custody
```
User Action → Middleware (requestId) → Handler → Audit Log → PostgreSQL
                                                          ↓
                                                    stdout (JSON)
                                                          ↓
                                                   Log aggregator
```

## 6. Compliance Checkpoints

### Pre-Audit Checklist
- [ ] All audit events persisted to PostgreSQL (not just ring buffer)
- [ ] IP hashing active (`HASH_AUDIT_IPS=true` or production mode)
- [ ] ENCRYPTION_KEY set (32+ chars) for TOTP secret encryption
- [ ] CSRF mandatory in production (no fallback to permissive)
- [ ] Rate limiting active on auth endpoints
- [ ] WAF enabled and logging blocks
- [ ] Dead-letter queue monitored for unresolved events

### Automated Verification
```bash
# Run compliance check
pnpm test:unit -- --reporter=verbose src/lib/security/
pnpm test:unit -- --reporter=verbose src/lib/crypto/
pnpm test:unit -- --reporter=verbose src/lib/auth/

# Check integrity monitor
pnpm test:unit -- --reporter=verbose src/lib/security/integrity-monitor.test.ts
```

## 7. Incident Response Integration

| Severity | Detection | Response Time | Escalation |
|----------|-----------|---------------|------------|
| Critical (data breach) | WAF + rate limit alerts | < 1 hour | DPO + legal |
| High (auth bypass attempt) | Audit log anomalies | < 4 hours | Security team |
| Medium (rate limit exceeded) | Structured logs | < 24 hours | DevOps |
| Low (WAF false positive) | WAF logs | Next business day | Development |

## 8. Regulatory References

| Regulation | Jurisdiction | Applicability |
|------------|-------------|--------------|
| GDPR (Reg. 2016/679) | EU | Personal data processing |
| LOPDGDD (LO 3/2018) | Spain | Spanish GDPR implementation |
| ENS (RD 311/2022) | Spain | National Security Framework |
| PCI DSS v4.0 | Global | Payment card data (if applicable) |
| eIDAS (Reg. 910/2014) | EU | Electronic identification |
| ICANN/ALAC guidelines | Global | Domain registration data (if applicable) |
