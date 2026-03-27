# Official Audit Plan — Instant Compliance Auditing

> Facilitates official audits by AEPD, NIS2 supervisors, or internal compliance teams.
> Last updated: 2026-03-27 | Festival Platform Template v1.7+

## 1. Data Tracing Architecture

```
USER ACTION ──► MIDDLEWARE ──► ROUTE HANDLER ──► AUDIT LOG ──► PostgreSQL
                  │                │                │
                  │                │                ├─► Structured JSON (stdout)
                  │                │                ├─► Ring buffer (dashboard)
                  │                │                └─► Persistent DB (compliance)
                  │                │
                  │                └─► Correlation ID (x-request-id)
                  │
                  └─► IP hashed (SHA-256, GDPR)
```

## 2. Audit Event Schema

Every auditable action produces a record with:

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| `timestamp` | ISO 8601 | `2026-03-27T12:00:00.000Z` | When |
| `action` | enum | `admin.login` | What |
| `actor` | string | `admin` | Who |
| `ip` | hash(16) | `96ad7e6841244a34` | From where (GDPR-safe) |
| `resource` | string | `lead-abc-123` | On what |
| `details` | JSON | `{"reason": "export"}` | Context |
| `requestId` | string | `aud-m1k2n3-xyz` | Correlation |
| `seq` | integer | `42` | Ordering |

## 3. Auditable Actions Registry

### Authentication Events
| Action | Trigger | Data Captured |
|--------|---------|--------------|
| `admin.login` | Successful login | IP, timestamp |
| `admin.login_failed` | Failed login | IP, reason, attempt count |
| `admin.logout` | Explicit logout | IP, session duration |
| `admin.2fa_enabled` | 2FA setup complete | Actor, method (TOTP) |
| `admin.2fa_disabled` | 2FA removed | Actor, reason |
| `admin.2fa_backup_used` | Backup code consumed | Actor, code index |

### Data Access Events
| Action | Trigger | Data Captured |
|--------|---------|--------------|
| `leads.view` | Dashboard view | Actor, filter criteria |
| `leads.export` | Data export | Actor, count, format |
| `leads.delete` | Soft-delete | Actor, lead ID, reason |

### System Events
| Action | Trigger | Data Captured |
|--------|---------|--------------|
| `system.config_change` | Settings modified | Actor, field, old→new |
| `system.queue_drain` | Queue processed | Count, duration |
| `system.metrics_reset` | Metrics cleared | Actor |

## 4. Instant Audit Queries

### 4.1 Via Admin API

```bash
# All login events (last 24h)
GET /api/admin/audit-log?action=admin.login&since=2026-03-26T00:00:00Z

# Failed login attempts
GET /api/admin/audit-log?action=admin.login_failed&limit=100

# All actions by specific actor
GET /api/admin/audit-log?actor=admin&limit=500

# Data access report (leads)
GET /api/admin/audit-log?action=leads.view&since=2026-01-01T00:00:00Z
```

### 4.2 Via PostgreSQL (Direct Audit)

```sql
-- GDPR Article 15: Subject Access Request
SELECT action, timestamp, resource, details
FROM audit_events
WHERE details->>'email' = 'subject@example.com'
ORDER BY created_at DESC;

-- NIS2: Incident timeline (last 72h)
SELECT *
FROM audit_events
WHERE created_at >= NOW() - INTERVAL '72 hours'
  AND action IN ('admin.login_failed', 'admin.login')
ORDER BY created_at;

-- Compliance: All data exports
SELECT actor, ip, created_at, details
FROM audit_events
WHERE action = 'leads.export'
ORDER BY created_at DESC;

-- Access review: Who accessed what, when
SELECT actor, action, resource, COUNT(*) as access_count,
       MIN(created_at) as first_access,
       MAX(created_at) as last_access
FROM audit_events
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY actor, action, resource
ORDER BY access_count DESC;
```

## 5. Audit Report Templates

### 5.1 Monthly Compliance Report

| Section | Query | Expected Output |
|---------|-------|-----------------|
| Total events | `SELECT COUNT(*) FROM audit_events WHERE created_at >= date_trunc('month', NOW())` | Number |
| Login attempts | Filter by `admin.login` + `admin.login_failed` | Success/fail ratio |
| Data access | Filter by `leads.*` | Access count by actor |
| System changes | Filter by `system.*` | Change log |
| 2FA status | Check `users.totp_enabled` | Enrollment rate |

### 5.2 Incident Response Report

| Phase | Data Source | Query |
|-------|-----------|-------|
| Timeline | `audit_events` | Last 72h, all actions |
| Impact | `leads` table | Records accessed/modified |
| Actor | `audit_events` | Unique actors + IPs |
| Remediation | `audit_events` | Config changes after incident |

## 6. Data Retention & Archival

| Data | Retention | Archival | Deletion |
|------|-----------|----------|----------|
| Audit events (DB) | 2 years | Annual export to cold storage | After retention + 1 year |
| Audit events (ring buffer) | 1000 entries | N/A (volatile) | On restart |
| Audit events (stdout) | Per log shipper config | Loki/CloudWatch/Datadog | Per provider policy |
| Login attempts (Redis) | 60 seconds | N/A | Auto-expire |
| Session tokens (Redis) | 8 hours | N/A | Auto-expire |

## 7. Compliance Mapping

| Regulation | Requirement | Our Implementation |
|-----------|------------|-------------------|
| GDPR Art. 30 | Records of processing | `audit_events` table |
| GDPR Art. 33 | Breach notification (72h) | Audit log + surge predictor |
| GDPR Art. 15 | Right of access | SQL query by subject email |
| NIS2 Art. 23 | Incident reporting | Structured logging + correlation IDs |
| LOPDGDD Art. 28 | DPIA | `docs/compliance/DPIA.md` |
| ISO 27001 A.12.4 | Logging and monitoring | Multi-layer audit system |
| PCI DSS 10 | Track access to cardholder data | Stripe handles (delegated) |

## 8. Audit Readiness Checklist

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Audit log persists to database | ✅ | `audit_events` table |
| 2 | All admin actions logged | ✅ | `auditLog.ts` integration |
| 3 | IP addresses hashed (GDPR) | ✅ | `hashIp.ts` |
| 4 | Login success/failure tracked | ✅ | `admin.login` + `admin.login_failed` |
| 5 | Data exports tracked | ✅ | `leads.export` action |
| 6 | Correlation IDs for tracing | ✅ | `requestId` field |
| 7 | Structured JSON format | ✅ | CloudWatch/Loki/Datadog compatible |
| 8 | Query API for auditors | ✅ | `/api/admin/audit-log` |
| 9 | Database indexes for fast queries | ✅ | Migration 007 |
| 10 | Retention policy documented | ✅ | 2-year retention |
| 11 | 2FA enrollment tracked | ✅ | `admin.2fa_enabled` action |
| 12 | DPIA documented | ✅ | `docs/compliance/DPIA.md` |
