# 🧪 COMMIT 6 Validation Checklist

**Duration:** 6-12 hours
**Objective:** Prove COMMIT 6 doesn't introduce regressions or hidden bugs

## ⚠️ Critical: What You're Actually Testing

This is NOT "does it work?" (you already know that)

This is: **"Does it STAY STABLE under realistic infrastructure chaos?"**

---

## 📊 METRICS YOU MUST CAPTURE

### A) Latency Degradation (THE SMOKING GUN)

Every 30 seconds, log:
```
Timestamp, P50_ms, P95_ms, P99_ms, Max_ms
T+30:    45,      120,    280,    1200
T+60:    48,      125,    290,    1250
T+90:    52,      135,    310,    1400  ⚠️ (trending up)
T+120:   58,      155,    380,    1800  🔴 (degrading)
```

**RED FLAGS:**
- P95 growing monotonically (connection pool saturating)
- P99 consistently >1000ms (backlog accumulating)
- Max latency >3s (timeout storms)

**PASS CRITERIA:**
- P50 stable ±10%
- P95 stable ±15%
- P99 stable ±20%

---

### B) Retry Rate Over Time

Track:
```
Timestamp, Retries/sec, Retry_Ratio (%)
T+30:    0.5,      1.2%
T+60:    0.6,      1.4%
T+90:    0.8,      2.1%  ⚠️
T+120:   2.1,      5.8%  🔴 (exponential)
```

**RED FLAGS:**
- Retry rate climbing linearly (system destabilizing)
- Retry ratio >5% (chaos too intense or system breaking)

**PASS CRITERIA:**
- Retry rate stable ±0.5/sec
- Ratio <2% consistently

---

### C) Job Backlog (CRITICAL)

Every 5 minutes:
```
Timestamp, Pending, Processing, Total_Backlog
T+0min:    50,      30,         80
T+5min:    52,      32,         84
T+10min:   48,      31,         79
T+60min:   55,      33,         88
T+120min:  120,     35,         155    🔴 (accumulating)
T+360min:  8500,    45,         8545   💥 (FAILED)
```

**RED FLAGS:**
- Backlog growing >100 jobs/hour (workers can't keep up)
- Pending jobs >5000 (queue overflow)
- Processing stuck >10 jobs (workers dead?)

**PASS CRITERIA:**
- Backlog stable ±20 jobs throughout test
- Never exceeds initial +200 jobs

---

### D) Lease Expiration Events

Count every hour:
```
Hour, Expired_Leases, Workers_Recovered
1:    12,             12
2:    15,             15
3:    18,             18
4:    45,             40  ⚠️ (some leases not recovered)
5:    120,            95  🔴 (recovery lag)
```

**RED FLAGS:**
- Expiration rate climbing (heartbeat failing under load)
- Recovery lag (reconciliation can't keep up)

**PASS CRITERIA:**
- Expiration rate stable (same order of magnitude)
- 100% recovery (expired_leases == workers_recovered)

---

### E) Redis Memory Growth

Snapshot every hour:
```
Hour, Redis_MB, Growth_MB, Growth_Rate
1:    250,      0,         -
2:    260,      10,        10MB/hr
3:    275,      25,        15MB/hr
4:    295,      45,        20MB/hr  ⚠️
5:    350,      100,       55MB/hr  🔴 (memory leak)
6:    420,      170,       70MB/hr  💥 (catastrophic)
```

**RED FLAGS:**
- Monotonic growth (memory leak)
- Growth rate increasing (accumulation accelerating)

**PASS CRITERIA:**
- Stable ±5MB/hour
- No obvious growth trend

---

### F) Stale Keys Accumulation

Every hour:
```
Hour, Total_Keys, Orphaned_Keys, Orphan_%, Issue
1:    1200,       40,            3.3%,     OK
2:    1250,       55,            4.4%,     OK
3:    1350,       85,            6.3%,     WARNING
4:    1550,       200,           12.9%,    🔴 (cleanup failing)
5:    2100,       580,           27.6%,    💥 (stale piling up)
```

**RED FLAGS:**
- Orphan % >10% (stale keys not being cleaned)
- Accumulating across hours (cleanup inadequate)

**PASS CRITERIA:**
- Orphan % <5% consistently
- Stable total key count (not growing)

---

### G) Database Connection Pool Health

Every 30 minutes:
```
Time,  Active, Idle, Total, Max_Allowed, Utilization%
T+0:   8,      22,   30,    50,          60%
T+30:  12,     18,   30,    50,          60%
T+60:  9,      21,   30,    50,          60%
T+90:  15,     15,   30,    50,          60%
T+180: 28,     2,    30,    50,          96%    ⚠️
T+240: 29,     1,    30,    50,          98%    🔴
T+300: 30,     0,    30,    50,          100%   💥 (exhausted)
```

**RED FLAGS:**
- Utilization >80% (saturation)
- Idle connections <5 (no reserve)

**PASS CRITERIA:**
- Utilization <70%
- Idle connections >5 always

---

### H) Worker Process Health

Track every hour:
```
Hour, Spawned, Killed, Avg_Lifetime, Restart_Rate
1:    30,      5,      12 min,       5/hr
2:    30,      6,      10 min,       6/hr
3:    30,      7,      9 min,        7/hr
4:    30,      15,     4 min,        15/hr   ⚠️ (dying fast)
5:    30,      35,     1.7 min,      35/hr   🔴 (cascading failures)
```

**RED FLAGS:**
- Restart rate increasing (workers destabilizing)
- Avg lifetime dropping <5 min (workers not viable)

**PASS CRITERIA:**
- Restart rate stable ±2/hr
- Avg lifetime >8 min

---

### I) Idempotency Hit Rate

Every hour:
```
Hour, Executions, Cache_Hits, Hit_Rate%
1:    12000,      120,        1.0%
2:    12100,      130,        1.1%
3:    11800,      115,        0.97%
4:    12500,      140,        1.1%
5:    500,        495,        99.0%    🔴 (all duplicates?)
```

**RED FLAGS:**
- Sudden spike in hit rate (duplicate floods)
- Hit rate goes to 0 (enforced idempotency failing)

**PASS CRITERIA:**
- Hit rate 0.5-2% (normal duplicate rate)
- Stable across hours

---

### J) Redis Proxy Chaos Metrics

Every hour (from proxy):
```
Hour, Timeouts, Slow_Ops, Resets, Corrupts, Total_Cmds
1:    24,       1450,    12,     6,       100000
2:    26,       1520,    14,     8,       102000
3:    25,       1480,    11,     7,       99500
4:    28,       1600,    15,     9,       101000
5:    31,       1550,    13,     8,       100500
```

**RED FLAGS:**
- Chaos injection too low (not realistic)
- Chaos injection too high (breaking things)

**PASS CRITERIA:**
- Rates match expected: 2% timeout, 15% slow, 1% reset, 0.5% corrupt
- System handles chaos gracefully

---

## 🎯 PASS/FAIL CRITERIA (FINAL)

**PASS if ALL of:**
- [ ] Latency: P95 stable ±15%, P99 stable ±20%
- [ ] Retries: Rate stable, ratio <2%
- [ ] Backlog: Never >initial+200 jobs
- [ ] Leases: 100% recovery, no lag
- [ ] Memory: Growth <5MB/hour
- [ ] Stale keys: Orphan% <5%
- [ ] Connections: Utilization <70%
- [ ] Workers: Restart rate stable
- [ ] Idempotency: Hit rate 0.5-2%
- [ ] Chaos: Handled gracefully
- [ ] **Zero duplicates** (hard requirement)
- [ ] **Zero lost jobs** (hard requirement)
- [ ] **Zero stuck jobs** (hard requirement)

**FAIL if ANY:**
- Latency trending up >20% (degradation)
- Backlog >5000 (queue collapse)
- Memory >1GB growth (leak)
- Connection pool exhausted
- Duplicate detected in DB
- Lost job (not in any queue/status)
- Restart storm (>50/hr)

---

## 🔧 CAPTURE TOOL (Run This)

```bash
# Start soak with monitoring
DURATION_HOURS=6 \
WORKERS=30 \
CHAOS=true \
CHAOS_REDIS_PROXY=true \
CHECK_INTERVAL_SEC=30 \
DRIFT_CHECK_INTERVAL=5 \
ts-node tests/soak/long-soak-runner.ts \
  2>&1 | tee soak-output-$(date +%s).log &

# In another terminal: periodically dump metrics
while true; do
  echo "=== $(date) ===" >> soak-metrics.log
  # Capture Redis info
  redis-cli INFO memory stats replication >> soak-metrics.log
  # Capture Postgres connections
  psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;" >> soak-metrics.log
  # Capture queue stats
  psql -c "SELECT status, count(*) FROM platform_outbox GROUP BY status;" >> soak-metrics.log
  sleep 30
done &

# Parse results after soak completes
ts-node tests/soak/analyze-soak-results.ts soak-output-*.log soak-metrics.log
```

---

## 📋 Pre-Soak Checklist

**BEFORE YOU START:**
- [ ] Logs set to DEBUG (need detail)
- [ ] Prometheus scrape interval 30s (capture degradation)
- [ ] Redis persistence OFF (faster, less noise)
- [ ] Postgres shared_buffers adequate (no contention)
- [ ] Kernel open file limits high enough (no EMFILE)
- [ ] Disk space >10GB (logs + chaos)
- [ ] Network stable (no actual outages during test)
- [ ] No other workloads (clean slate)
- [ ] Monitoring dashboard up (Grafana, etc)
- [ ] Alerting disabled (don't spam)

---

## 🎬 Step-by-Step Execution

### Hour 0: Setup
```bash
# Fresh DB
npm run db:migrate
npm run db:seed:test

# Start Redis
redis-server --port 6379 &

# Start Redis proxy (chaos)
CHAOS_REDIS_PROXY=true ts-node src/lib/redis/chaos-proxy.ts &

# Verify connectivity
redis-cli -p 6380 PING  # Via proxy
```

### Hour 0-6: Monitor Live
```bash
# Terminal 1: Soak runner
DURATION_HOURS=6 WORKERS=30 CHAOS=true CHAOS_REDIS_PROXY=true \
  ts-node tests/soak/long-soak-runner.ts

# Terminal 2: Metrics capture
watch -n 30 'redis-cli INFO memory | grep used_memory'

# Terminal 3: Tail logs
tail -f soak-output-*.log | grep -E "WARNING|ERROR"

# Terminal 4: Drift detector
every 5 minutes: ts-node tests/soak/drift-detector.ts >> drift.log
```

### Hour 6+: Analysis
```bash
# Parse metrics
ts-node tests/soak/analyze-soak-results.ts soak-output-*.log

# Generate report
cat soak-report.md
```

---

## 🔴 IF IT FAILS

Don't jump to COMMIT 7. Instead:

1. **Identify failure mode** (is it Redis proxy? Idempotency enforcement? Natural degradation?)
2. **Create minimal repro** (narrow down to specific scenario)
3. **Fix in-place** (iterate on COMMIT 6, don't move forward)
4. **Re-validate** (run soak again)
5. **Only then** proceed to COMMIT 7

---

## ✅ IF IT PASSES

You have evidence:
- System stable for 6-12 hours under realistic chaos
- No memory leaks
- No connection exhaustion
- No duplicate processing
- No lost jobs
- Latency stable
- Backlog stable

**THEN:** COMMIT 7-8 are actually meaningful (you're adding observability to a proven-stable system, not guessing)
