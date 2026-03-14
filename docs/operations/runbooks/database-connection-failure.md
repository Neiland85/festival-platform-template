# Runbook — Database Connection Failure

## Symptoms

- API responses return 500
- /api/v1/events fails
- /api/v1/leads fails
- dashboard cannot load events

Logs may contain:

events_list_error
lead_saved_error
pool connection error

---

## Detection

Health endpoint:

/api/readyz

Expected response:

{ "status": "ready" }

If database fails:

{ "status": "degraded" }

---

## Immediate Action

1. Verify Supabase status

https://status.supabase.com

2. Check connection string

Environment variable:

DATABASE_URL

3. Test connection manually

psql "$DATABASE_URL"

---

## Recovery Procedure

If connection pool is stuck:

Redeploy service

Vercel Dashboard
→ Deployments
→ Redeploy latest

This resets connection pools.

---

## Long-Term Fix

If recurring:

- reduce connection pool size
- use Supabase pooler endpoint
- verify SSL configuration
