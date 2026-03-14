# SolarisNerja Platform — System Resilience

This document defines operational resilience, failure detection and recovery procedures.

The platform is designed to continue operating even if individual components fail.

---

# System Overview

Frontend
- Next.js 16 (App Router)
- Static + Dynamic rendering
- Vercel Edge runtime

Backend
- API routes
- Admin dashboard routes

Database
- Supabase PostgreSQL
- Connection pooling

External services
- Ticketmaster

---

# Failure Isolation Strategy

The architecture isolates failures between:

Frontend
API
Database
External services

This prevents cascading failures.

---

# Critical Services

Priority 1 (must remain operational)

- Landing page
- Event pages
- Ticket links
- Lead capture

Priority 2

- Dashboard
- Analytics
- Forecast metrics

Priority 3

- Admin exports
- Marketing analytics

---

# Recovery Targets

API failure
Recovery time: < 5 minutes

Database connection issue
Recovery time: < 10 minutes

External service failure
Recovery time: user-facing fallback

---

# Observability

Signals used for detection:

/api/healthz
/api/readyz

API logs
Error logs
Lead ingestion metrics

---

# Fail-safe Behaviour

If database fails:
API returns problem JSON

If Ticketmaster fails:
Ticket purchase temporarily unavailable

If dashboard fails:
Public website remains fully operational
