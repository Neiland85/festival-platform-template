# 🔴 Chaos Testing — Distributed Queue Under Attack

Automated failure injection testing for the Redis/Postgres distributed job queue system.

## Overview

This chaos testing suite simulates **7 real-world failure scenarios** and validates that the system:
- ✅ Never duplicates job processing
- ✅ Never loses jobs
- ✅ Never enters zombie/stale states
- ✅ Maintains Redis/Postgres consistency
- ✅ Enforces idempotency guarantees

## Attack Scenarios

### 1. **Reconciliation Race** 🏃
**Problem:** Heartbeat renews lease while reconciliation is checking if it expired.

**Timeline:**
```
T0: Reconciliation checks: lease doesn't exist
T1: Heartbeat renews lease (WINDOW)
T2: Reconciliation tries to move job to pending
→ Job ends up in BOTH pending AND processing (split-brain)
```

**Fix:** Lua script for atomic check-and-move operation

**Run:**
```bash
ts-node chaos-runner.ts --scenario reconciliation_race
```

---

### 2. **NACK Job Loss** 🗑️
**Problem:** Crash between removing from processing and adding back to pending.

**Timeline:**
```
T0: Worker calls nackJob() on failed job
T1: lrem(PROCESSING_SET) — removed
T2: CRASH
T3: Job is NOWHERE (not in pending, not in processing)
→ Job is lost forever, no recovery possible
```

**Fix:** Add to pending FIRST, then remove from processing

**Run:**
```bash
ts-node chaos-runner.ts --scenario nack_job_loss
```

---

### 3. **Domain Idempotency Window** 🎯
**Problem:** Effect executes but crash happens before recording in database.

**Timeline:**
```
T0: executeWithDomainIdempotency() checks: operation not recorded
T1: Calls operation() → CREATES LEAD in CRM (side effect!)
T2: CRASH before INSERT into applied_operations
T3: Lease expires, job retried
T4: Another worker also sees "not recorded" → DUPLICATE LEAD
```

**Fix:** Pre-insert with status='pending', execute, then mark 'completed'

**Run:**
```bash
ts-node chaos-runner.ts --scenario domain_idempotency_window
```

---

### 4. **Heartbeat Zombie Lease** 👻
**Problem:** Lease persists indefinitely after job completion.

**Timeline:**
```
T0: ackJob() deletes job data but lease delete fails (partial failure)
T1: Heartbeat wakes up, sees lease exists
T2: Heartbeat renews lease
T3: Reconciliation skips job (thinks it's processing)
→ Queue stuck with phantom job
```

**Fix:** Delete lease FIRST (critical for heartbeat to detect completion)

**Run:**
```bash
ts-node chaos-runner.ts --scenario heartbeat_zombie_lease
```

---

### 5. **Redis Partial Failure** 🔌
**Problem:** Some Redis operations succeed, others fail (network timeout).

**Timeline:**
```
T0: ackJob() calls lrem() → SUCCESS
T1: ackJob() calls del(lease) → TIMEOUT/FAIL
T2: ackJob() calls del(jobData) → NEVER CALLED
→ Processing set is clean, but lease and data still exist
```

**Fix:** Atomic cleanup using Lua script or ordered deletion

**Run:**
```bash
ts-node chaos-runner.ts --scenario redis_partial_failure
```

---

### 6. **Duplicate Enqueue** 📋
**Problem:** Same job enqueued twice (broken outbox replay logic).

**Timeline:**
```
T0: Job enqueued from Postgres outbox
T1: Job processed, marked completed
T2: Cron job reruns (without status filter)
T3: Same job enqueued again
→ Duplicate in queue
```

**Fix:** Ensure cron filters by status='queued' AND uses idempotency tokens

**Run:**
```bash
ts-node chaos-runner.ts --scenario duplicate_enqueue
```

---

### 7. **Network Partition** 🔗
**Problem:** Redis and Postgres diverge (one updates, other doesn't).

**Timeline:**
```
T0: ackJob() updates Postgres → SUCCESS
T1: ackJob() deletes from Redis → TIMEOUT (network partition)
→ Postgres says "completed", Redis still shows "processing"
```

**Fix:** Postgres-first pattern (already implemented)

**Run:**
```bash
ts-node chaos-runner.ts --scenario network_partition
```

---

## Running Tests

### Run all scenarios
```bash
ts-node chaos-runner.ts --all
```

### Run specific scenario
```bash
ts-node chaos-runner.ts --scenario reconciliation_race
```

### Run with monitoring
```bash
# In one terminal: watch system state
watch -n 1 'redis-cli LLEN platform:queue:pending'

# In another: run chaos tests
ts-node chaos-runner.ts --all
```

---

## System Validators

After each attack, the system is validated for:

✅ **Duplicate Processing**
- No idempotency token appears with multiple completed entries
- Applied operations are unique per token

✅ **Lost Jobs**
- All jobs in Redis exist in Postgres
- All queued/processing jobs in Postgres are recoverable

✅ **Zombie Jobs**
- No completed jobs have active leases
- No jobs in processing are marked completed
- No orphaned Redis data without Postgres entries

✅ **Idempotency Integrity**
- UNIQUE constraint on idempotency_token enforced
- applied_operations has UNIQUE(token, operation_type)
- No operations stuck in PENDING state >5 min

✅ **Redis/Postgres Consistency**
- All queued/processing jobs in both systems
- No orphaned data in either system
- Status matches across systems

---

## Expected Results

**After applying COMMIT 3 fixes:**

```
Total Tests: 7
✅ Passed:   7
❌ Failed:   0
⚠️  Errors:   0

System Consistent: ✅ YES

🎉 ALL TESTS PASSED — SYSTEM RESILIENT TO CHAOS ATTACKS
```

---

## Adding New Scenarios

Edit `chaos-scenarios.ts`:

```typescript
export const myNewScenario: ChaosScenario = {
  name: "my_scenario_name",
  description: "What this attack tests",

  attack: async () => {
    // Simulate the failure
    log("info", "chaos_my_scenario_attack", { ... })
  },

  validate: async () => {
    // Check system is still consistent
    return {
      passed: true,  // or false if inconsistency detected
      reason: "Why it passed or failed"
    }
  }
}

// Add to CHAOS_SCENARIOS array
CHAOS_SCENARIOS.push(myNewScenario)
```

---

## Production Recommendations

1. **Run chaos tests in staging** after every deployment
2. **Monitor during chaos testing** (watch queue depth, error rates, latencies)
3. **Set up alerting** for:
   - Jobs stuck in processing >30 min
   - Zombie leases for completed jobs
   - Redis/Postgres divergence
4. **Run nightly** with different time seeds for better coverage

---

## References

- Failure Injection Audit: `docs/FAILURE_INJECTION_AUDIT.md`
- Production Hardening: `docs/PRODUCTION_HARDENING_COMPLETE.md`
- Queue Architecture: `docs/QUEUE_RECONCILIATION.md`
