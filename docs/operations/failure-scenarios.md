# SolarisNerja — Failure Scenarios

This document defines critical failure simulations for the platform.

The goal is to ensure the system can recover without downtime.

---

## System Components

Frontend
- Next.js (App Router)
- Vercel deployment

Backend
- API routes (/api/v1)
- Admin API (/api/admin)

Database
- Supabase PostgreSQL

External services
- Ticketmaster

---

## Critical Failure Types

1. Database connection failure
2. API route crash
3. Admin authentication failure
4. Rate limit overload
5. Ticketmaster external outage
6. Unexpected traffic spike
7. Edge proxy misconfiguration

Each failure has a defined runbook.

See: ./runbooks
