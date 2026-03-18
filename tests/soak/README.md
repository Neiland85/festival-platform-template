# 🔥 Soak Testing — Long-Running Chaos Validation

**The test that separates "works" from "doesn't break in production"**

## Overview

This soak test suite runs your distributed queue system under:
- **Hard kills** (process.exit(1) simulating OOM or crash)
- **Random errors** at critical points
- **Variable latencies** (network simulation)
- **Continuous job flooding** (50 jobs/sec with intentional duplicates)
- **Real-time consistency checks** (every 10 seconds)

For **1+ hours** with **20+ workers dying randomly**.

If it survives? **You can deploy with confidence.**

---

## Quick Start

### 1. Prerequisites

Ensure you have Redis and Postgres running locally:

```bash
# Redis
redis-server

# Postgres (or Docker)
docker run -d \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15
```

### 2. Build the project

```bash
npm run build
```

### 3. Run soak test (1 hour, 20 workers)

```bash
# Enable chaos monkey, run for 1 hour with 20 workers
CHAOS=true WORKERS=20 DURATION_HOURS=1 \
  ts-node tests/soak/soakRunner.ts &

# In parallel: flood jobs at 50/sec
CHAOS=true RATE=50 DURATION_MINUTES=60 \
  ts-node tests/soak/flooder.ts
```

---

## What You'll See

### During Execution

```
[SOAK] Checkpoint #1 | Workers: 20 spawned, 3 killed | Failed Checks: 0/1 (0%) | Elapsed: 0.2 min
[SOAK] Checkpoint #2 | Workers: 20 spawned, 7 killed | Failed Checks: 0/2 (0%) | Elapsed: 0.3 min
[FLOODER] Batch 10 | Jobs: 500 | Failed: 0 | Throughput: 47 jobs/sec | Elapsed: 0.17 min
[FLOODER] Batch 20 | Jobs: 1000 | Failed: 2 | Throughput: 50 jobs/sec | Elapsed: 0.33 min
```

**Expected behavior:**
- ✅ Workers dying every few seconds
- ✅ Latencies injected randomly
- ✅ Errors thrown at critical points
- ✅ **All consistency checks PASS**

**NOT expected:**
- ❌ Duplicate operations
- ❌ Lost jobs
- ❌ Zombie leases/jobs
- ❌ Redis/Postgres divergence

### Final Report

```
╔════════════════════════════════════════════════════════════╗
║               📈 SOAK TEST FINAL REPORT                    ║
╚════════════════════════════════════════════════════════════╝

Duration: 60.0 minutes

Workers:
  Spawned: 20
  Killed:  247
  Avg Lifetime: 14.5s

Consistency Checks:
  Run: 361
  Failed: 0
  Failure Rate: 0%

╔════════════════════════════════════════════════════════════╗
║  ✅ SOAK TEST PASSED — System survived 60.0min chaos       ║
║  Workers were killed 247 times                             ║
║  No consistency violations detected                        ║
╚════════════════════════════════════════════════════════════╝
```

---

## Configuration

### Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CHAOS` | `false` | Enable chaos monkey ("true") |
| `WORKERS` | `20` | Number of concurrent workers |
| `DURATION_HOURS` | `1` | How long to run test |
| `CHECK_INTERVAL_SEC` | `10` | Consistency check frequency |
| `RATE` | `50` | Jobs/sec flood rate |
| `DUPLICATE_RATE` | `0.3` | Probability of duplicate token |
| `CHAOS_ERROR_RATE` | `0.05` | Probability of error injection (5%) |
| `CHAOS_LATENCY_RATE` | `0.1` | Probability of latency (10%) |
| `CHAOS_MAX_LATENCY_MS` | `3000` | Max latency in milliseconds |
| `CHAOS_KILL_RATE` | `0.01` | Probability of hard kill (1%) |

### Example Configurations

#### Gentle test (30 min, 5 workers)
```bash
CHAOS=true WORKERS=5 DURATION_HOURS=0.5 \
  ts-node tests/soak/soakRunner.ts &

RATE=10 DURATION_MINUTES=30 \
  ts-node tests/soak/flooder.ts
```

#### Extreme test (4 hours, 50 workers, high chaos)
```bash
CHAOS=true WORKERS=50 DURATION_HOURS=4 \
  CHAOS_ERROR_RATE=0.15 CHAOS_KILL_RATE=0.05 \
  ts-node tests/soak/soakRunner.ts &

RATE=200 DURATION_MINUTES=240 DUPLICATE_RATE=0.5 \
  ts-node tests/soak/flooder.ts
```

#### Production-grade overnight test
```bash
CHAOS=true WORKERS=100 DURATION_HOURS=8 \
  ts-node tests/soak/soakRunner.ts &

RATE=500 DURATION_MINUTES=480 \
  ts-node tests/soak/flooder.ts
```

---

## Understanding Failures

### ❌ Duplicate Operations

**Symptom:** `Found N duplicate completed operations`

**Root Cause:** Two workers executed the same side effect (e.g., created two leads)

**Fix:** Verify pre-insert idempotency pattern is working (domain_operation_after injection)

**Debug:**
```sql
SELECT idempotency_token, operation_type, COUNT(*)
FROM applied_operations
WHERE status = 'completed'
GROUP BY idempotency_token, operation_type
HAVING COUNT(*) > 1;
```

---

### ❌ Lost Jobs

**Symptom:** `Consistency check failed: N jobs lost`

**Root Cause:** Job disappeared from both Redis and Postgres (crash before DB write)

**Fix:** Verify atomic retry pattern (add to pending BEFORE removing from processing)

**Debug:**
```sql
SELECT job_id, status FROM platform_outbox
WHERE job_id NOT IN (
  SELECT job_data_key FROM redis_keys  -- pseudo-query
)
AND status IN ('queued', 'processing');
```

---

### ❌ Zombie Leases

**Symptom:** `Found N zombie leases for completed jobs`

**Root Cause:** Job marked completed in Postgres but lease still exists in Redis

**Fix:** Verify lease is deleted FIRST in ackJob()

**Debug:**
```bash
# Check if completed job has lease
redis-cli EXISTS "platform:job_lease:{jobId}"
```

---

### ❌ Redis/Postgres Divergence

**Symptom:** `N Redis/Postgres divergences detected`

**Root Cause:** Job in one system but not the other

**Likely causes:**
- Partial failure in dequeue (job moved to processing but DB update failed)
- Partial failure in cleanup (Postgres updated but Redis cleanup failed)

**Fix:** Use Postgres-first pattern + reconciliation

---

## Interpreting Metrics

### Workers Killed vs Duration

**Good:** ~4-5 kills per minute (20 workers × 1% kill rate ≈ 0.2 kills/sec)

**Bad:** Zero kills (chaos not injected), or >10 kills/min (possible actual crashes)

### Consistency Check Failure Rate

**Good:** 0% (all checks pass)

**Warning:** <1% (occasional issues, investigate)

**Critical:** >1% (systemic problem, don't deploy)

### Job Processing

**Expected:**
- ~50 jobs/sec throughput (matches RATE setting)
- ~95% success rate (some fail due to chaos)
- High latency variance (due to injected delays)

**Red flags:**
- <10 jobs/sec (system might be hung)
- <80% success rate (too many cascading failures)
- All jobs failing (systematic issue)

---

## Production Runbook

### Before deploying to production:

1. **Run 1-hour soak test locally**
   ```bash
   CHAOS=true WORKERS=20 DURATION_HOURS=1 ts-node tests/soak/soakRunner.ts
   ```

2. **Verify all checks pass** (0% failure rate)

3. **Run overnight soak in staging** (8+ hours)
   ```bash
   # Schedule via cron or CI/CD
   0 22 * * * cd /app && CHAOS=true WORKERS=50 DURATION_HOURS=8 ts-node tests/soak/soakRunner.ts
   ```

4. **Monitor production metrics**
   - Queue depth
   - Job success rate
   - Processing latency
   - Redis/Postgres lag

### If test fails:

1. Check logs for specific issue (duplicates, loss, divergence)
2. Identify failure pattern (time-based, load-based, random)
3. Add focused unit test to catch the bug
4. Run soak test again to verify fix
5. **Do NOT deploy** until soak passes

---

## Continuous Deployment Integration

### GitHub Actions Example

```yaml
name: Soak Test

on:
  schedule:
    - cron: '0 22 * * *'  # Every night at 10 PM
  workflow_dispatch:

jobs:
  soak:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: password

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci
      - run: npm run build

      - name: Run soak test (1 hour)
        env:
          CHAOS: 'true'
          WORKERS: 20
          DURATION_HOURS: 1
          RATE: 100
        run: |
          timeout 90m bash -c '
            ts-node tests/soak/soakRunner.ts &
            PID=$!
            ts-node tests/soak/flooder.ts
            wait $PID
          '

      - name: Report results
        if: always()
        run: |
          # Parse logs for failures
          if grep -q "FAILED" soaktest.log; then
            echo "❌ Soak test failed"
            exit 1
          else
            echo "✅ Soak test passed"
          fi
```

---

## Advanced: Custom Checks

Add domain-specific consistency checks:

```typescript
// tests/soak/customChecks.ts

export async function checkLeadsUniqueness() {
  // Verify no duplicate leads in CRM despite duplicate tokens
  const duplicateLeads = await crmClient.query(
    'SELECT email FROM leads GROUP BY email HAVING COUNT(*) > 1'
  )
  return duplicateLeads.length === 0
}

export async function checkPaymentIdempotency() {
  // Verify no double charges
  const doubleCharges = await paymentClient.query(
    'SELECT idempotency_key FROM charges GROUP BY idempotency_key HAVING COUNT(*) > 1'
  )
  return doubleCharges.length === 0
}
```

Add to soakRunner before final report:
```typescript
const customPassed = await checkLeadsUniqueness() && await checkPaymentIdempotency()
```

---

## 🎓 What This Teaches You

By running this soak test, you'll learn:

1. **Where your system breaks** (usually not where you think)
2. **How long workers survive** average chaos (baseline)
3. **Recovery speed** after failures (instrumentation)
4. **Idempotency guarantees** under extreme conditions
5. **Edge cases in your retry logic** (TOCTOU bugs)

---

## 🚀 Success Criteria

Your system is **production-ready** when it:

- ✅ Survives 1+ hour with 20+ workers dying randomly
- ✅ **Zero consistency violations** across all checks
- ✅ **Zero duplicate operations** despite 30% duplicate token rate
- ✅ **Zero lost jobs** in DB or queues
- ✅ Recovers fully after each worker death
- ✅ Processes >40 jobs/sec sustained
- ✅ No zombie leases or stale state

If all these pass: **Deploy. You're good.**

---

## Questions?

- `docs/FAILURE_INJECTION_AUDIT.md` — What can fail
- `docs/PRODUCTION_HARDENING_COMPLETE.md` — How we fixed it
- `src/lib/security/chaosMonkey.ts` — How chaos works
