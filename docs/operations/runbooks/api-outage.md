# Runbook — API Failure

## Symptoms

- /api/v1/events returns 500
- /api/v1/leads returns 500
- dashboard metrics fail

---

## Detection

Check health endpoints:

/api/healthz
/api/readyz

---

## Immediate Action

Check Vercel logs:

vercel logs

Look for:

event_create_error
internal_error
validation_failed

---

## Recovery

If deployment issue:

Redeploy last successful build.

If code regression:

Rollback:

git revert <commit>

Push new deployment.

---

## Prevention

CI must pass:

pnpm lint
pnpm test
pnpm build
