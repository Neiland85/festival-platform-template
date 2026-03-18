# 🔥 SRE Operational Guide: COMMIT 6 Soak Validation

**This is NOT code review. This is production-grade infrastructure testing.**

The difference:
```
❌ "Does it work?"
✅ "Does it stay stable for 6-12 hours under realistic chaos?"
```

---

## 📊 The 12 Metrics That Matter

Not all metrics are equal. These 12 detect EVERYTHING:

### 🔥 1. THROUGHPUT (jobs processed/sec)
**Red Flag:** Starts at 50/sec, drops to 30, 20, 10
**Why:** Even without errors, system is degrading

**What to watch:**
```
T+0h:    50 jobs/sec
T+1h:    48 jobs/sec  ✅ OK (±4%)
T+2h:    45 jobs/sec  ⚠️  Warn (±10%)
T+3h:    35 jobs/sec  🔴 FAIL (±30%)
```

**Action if failing:** System can't keep up. Either chaos too intense or real bottleneck.

---

### ⚡ 2. LATENCY (P95, P99, MAX)
**Red Flag:** P95 stable but P99 exploding
**Why:** Indicates internal queues or locks

**What to watch:**
```
        P50    P95    P99    MAX
T+0h:   45ms   120ms  280ms  1200ms
T+1h:   48ms   125ms  290ms  1250ms  ✅ OK
T+2h:   52ms   135ms  310ms  1400ms  ✅ OK (±15%)
T+3h:   58ms   155ms  380ms  1800ms  ⚠️  Warn (±30%)
T+6h:   120ms  400ms  5000ms 30000ms 🔴 FAIL (chaos too intense or real issue)
```

**Action if failing:** Check if P99 is legitimate (chaos) or system slow.

---

### 🧵 3. BACKLOG (pending + processing jobs)
**This is THE most important metric.**

**Red Flag:** Growing monotonically
**Why:** Producers > consumers = queue overflow

**What to watch:**
```
T+0h:    50 total
T+1h:    52 total   ✅ OK (stable ±10)
T+2h:    48 total   ✅ OK
T+6h:    500 total  🔴 FAIL (system can't keep up)
T+12h:   8000 total 💥 CATASTROPHIC (queue collapsed)
```

**Hard rule:** If backlog > 5000, system FAILED.

---

### 🔁 4. RETRY RATIO (retries / total jobs)
**Red Flag:** Increasing over time
**Why:** System getting unstable or chaos too intense

**What to watch:**
```
T+0h:    1.0%  ✅ Normal
T+1h:    1.2%  ✅ OK
T+2h:    1.5%  ✅ OK
T+3h:    3.0%  ⚠️  Warn (chaos taking effect)
T+6h:    8.0%  🔴 FAIL (retry storm)
T+12h:   25%   💥 Feedback loop
```

**Hard rule:** If retry ratio > 5%, watch closely. If > 10%, FAILED.

---

### 🧠 5. IDEMPOTENCY HIT RATE
**What to watch:** Should be 0.5-2% (normal duplicates)

**Red Flag:** Suddenly spikes to 50%+
**Why:** Massive retry wave or duplication upstream

```
T+0h:    1.0%  ✅ Normal
T+6h:    1.2%  ✅ OK
T+12h:   45%   🔴 FAIL (excessive duplicates)
```

---

### ⏱️ 6. LEASE EXPIRATIONS & RENEWALS
**Red Flag:** Expirations growing, renewals can't keep up
**Why:** Workers too slow or heartbeat failing

```
Hour  Expired  Recovered  Status
1:    12       12         ✅ OK
2:    15       15         ✅ OK
3:    18       18         ✅ OK
4:    45       40         ⚠️  Lag
5:    120      95         🔴 FAIL (recovery can't keep up)
```

**Hard rule:** Expired == Recovered always. If not, system failing.

---

### 🧟 7. ZOMBIE JOBS (jobs in processing without lease)
**Red Flag:** ANY > 0 is a problem
**Why:** Dead jobs stuck in queue

**Hard rule:** Must be 0 at all times. If > 0, FAILED.

---

### 🧹 8. REDIS MEMORY & STALE KEYS
**Red Flag:** Memory growing monotonically
**Why:** Memory leak or garbage accumulation

**What to watch:**
```
T+0h:    250MB   Growth: 0
T+1h:    260MB   Growth: 10 MB/hr   ✅ OK
T+2h:    270MB   Growth: 10 MB/hr   ✅ OK
T+3h:    300MB   Growth: 30 MB/hr   ⚠️  Warn
T+6h:    420MB   Growth: 70 MB/hr   🔴 FAIL (leak)
```

**Hard rule:** Growth <5 MB/hour is OK. >20 MB/hour is FAIL.

**Stale Keys:** Should be <5% of total keys
```
Total Keys: 1200
Orphaned:   40       (3.3%)   ✅ OK
Orphaned:   600      (50%)    🔴 FAIL (cleanup broken)
```

---

### 🗄️ 9. POSTGRES CONNECTIONS
**Red Flag:** Growing without falling
**Why:** Connection pool exhaustion or leaks

**What to watch:**
```
        Active  Idle  Utilization  Status
T+0h:   8       22    27%          ✅ OK
T+3h:   15      15    50%          ✅ OK
T+6h:   28      2     93%          🔴 FAIL (exhausted)
T+12h:  30      0     100%         💥 LOCKED
```

**Hard rule:** Utilization <70%. If >= 80%, FAILED.

---

### 🔀 10. REDIS ↔ POSTGRES CONSISTENCY
**Red Flag:** ANY divergence > 0
**Why:** Corruption or state desync

**Hard rule:** Must be 0 always. If > 0, FAILED immediately.

---

### 💣 11. ERROR RATE (the trick)
**Important caveat:** Errors can be HEALTHY (expected under chaos)
**What matters:** Are they GROWING?

```
T+0h:    10 errors (maybe)
T+6h:    12 errors OK (stable)
T+12h:   15 errors OK (stable)

vs

T+0h:    10 errors
T+3h:    50 errors ⚠️  (growing)
T+6h:    200 errors 🔴 (exponential)
```

**Key insight:** 20 constant errors = OK. 5 errors growing to 50 = NOT OK.

---

### 📉 12. TIME DRIFT (processing time increasing)
**Red Flag:** Avg job time slowly climbing
**Why:** Internal congestion

**What to watch:**
```
T+0h:    200ms avg
T+6h:    210ms avg   ✅ OK (5% slowdown is natural)
T+12h:   500ms avg   🔴 FAIL (150% slowdown)
```

---

## 🎯 The Setup (30 minutes)

### Step 1: Install Monitoring Stack
```bash
# Docker Compose setup
cat > docker-compose.monitoring.yml <<'EOF'
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./tests/soak/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  redis_exporter:
    image: oliver006/redis_exporter:latest
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis:6379

  postgres_exporter:
    image: prometheuscommunity/postgres-exporter:latest
    ports:
      - "9187:9187"
    environment:
      - DATA_SOURCE_NAME=postgresql://user:password@postgres:5432/platform?sslmode=disable

volumes:
  prometheus_data:
  grafana_data:
EOF

docker-compose -f docker-compose.monitoring.yml up -d
```

### Step 2: Import Dashboard
```bash
# Open Grafana at http://localhost:3000
# Admin/admin
# Import dashboard from: tests/soak/grafana-dashboard.json
```

### Step 3: Configure Alerts
In Grafana, add alerts for:
- Backlog > 1000
- Latency P99 > 2000ms
- Memory growth > 5MB/hr
- Zombie jobs > 0
- Retry ratio > 5%

---

## 🚀 The Soak Test (6-12 hours)

### Terminal 1: Run Soak
```bash
DURATION_HOURS=6 \
WORKERS=30 \
CHAOS=true \
CHAOS_REDIS_PROXY=true \
CHAOS_ERROR_RATE=0.05 \
CHAOS_KILL_RATE=0.01 \
ts-node tests/soak/long-soak-runner.ts \
  2>&1 | tee soak-output-$(date +%s).log
```

### Terminal 2: Monitor Dashboard
```
Open http://localhost:3000
Watch the 8 panels live
Look for:
  ✅ Throughput: stable ±10%
  ✅ Latency: P95 stable ±15%
  ✅ Backlog: flat or growing <1/minute
  ✅ Retries: <2%
  ✅ Memory: <5MB/hr growth
  ✅ Zombies: 0
  ✅ Connections: <70%
```

### Terminal 3: Metrics Snapshot (every 5 minutes)
```bash
watch -n 300 'ts-node tests/soak/sre-metrics-collector.ts >> soak-metrics.log'
```

### Terminal 4: Tail Logs
```bash
tail -f soak-output-*.log | grep -E "ERROR|WARNING|FAIL"
```

---

## 📋 The Checklist (After Test)

### RED FLAGS — AUTOMATIC FAIL

```
❌ Any zombie jobs > 0
❌ Any Redis/Postgres divergence > 0
❌ Backlog > 5000 ever
❌ Latency P99 > 10000ms sustained
❌ Retry ratio > 10% sustained
❌ Memory growth > 20MB/hour average
❌ Postgres connection utilization > 80%
❌ Duplicate detected in applied_operations
❌ Lost job (not in any queue/status)
```

### YELLOW FLAGS — NEEDS INVESTIGATION

```
⚠️  Latency P95 climbing >15%
⚠️  Backlog growing 1+/minute consistently
⚠️  Retry ratio 5-10%
⚠️  Memory growth 5-20MB/hour
⚠️  Lease expirations > 20% lag
⚠️  Postgres utilization 70-80%
⚠️  Stale keys > 5%
```

### GREEN FLAGS — PASS

```
✅ Throughput stable ±10%
✅ Latency stable ±15%
✅ Backlog flat or <+200 jobs over 6h
✅ Retry ratio <2%
✅ Zero zombies
✅ Zero divergence
✅ Memory stable <5MB/hr
✅ Connections <70%
✅ All workers survived restarts
```

---

## 🔬 The Analysis (After Test)

### Run Results Analyzer
```bash
ts-node tests/soak/analyze-soak-results.ts soak-output-*.log
cat soak-validation-report.md
```

### Generate Metrics CSV (for charting)
```bash
ts-node tests/soak/export-metrics-csv.ts soak-metrics.log > metrics.csv
# Import into Excel/Sheets for trending analysis
```

---

## 🧨 Death Patterns (What to Spot)

### Pattern 1: "Slow Death"
```
Everything looks OK but each hour slightly worse:
T+0h:   50/sec, 150ms, 50 backlog
T+1h:   48/sec, 160ms, 75 backlog
T+2h:   45/sec, 180ms, 120 backlog
T+3h:   40/sec, 220ms, 200 backlog
```
**Action:** This is exponential decay. System failing gradually.

### Pattern 2: "Retry Storm"
```
Retries stable then suddenly explode:
T+0h:   1%
T+5h:   2%
T+5h15m: 8%
T+5h30m: 25%
T+6h:   crashed
```
**Action:** Feedback loop. Chaos too intense or real issue.

### Pattern 3: "Memory Creep"
```
Memory grows smoothly:
T+0h:   250MB
T+6h:   450MB (+200MB / 33MB/hr)
T+12h:  700MB
```
**Action:** Leak. Either garbage not cleaning or objects retaining.

### Pattern 4: "Backlog Explosion"
```
Backlog suddenly explodes:
T+0-5h: 50-100 jobs (stable)
T+5h15m: 5000 jobs (sudden)
T+5h30m: 15000 jobs (cascading)
```
**Action:** System hit limit. Everything downstream blocked.

---

## ✅ If ALL Pass

You have proof:
```
✅ System stable for 6-12 hours
✅ Workers dying + restarting gracefully
✅ Redis TCP chaos handled
✅ No memory leaks
✅ No connection exhaustion
✅ No duplicate processing
✅ No lost jobs
✅ Latency stable
✅ Backlog stable
```

**THEN:** You can proceed to COMMIT 7-8 with confidence.

---

## ❌ If ANY Red Flag

**DO NOT PROCEED TO COMMIT 7-8.**

Instead:
1. Identify which metric failed
2. Create minimal repro (reproduce with fewer workers, shorter duration)
3. Fix in COMMIT 6 (iterate)
4. Re-validate (shorter soak, like 1-2h)
5. Once pass: Re-run full 6-12h soak
6. THEN proceed to COMMIT 7-8

---

## 🎯 Remember

This is not about finding bugs. This is about proving the system DOESN'T break over time.

The hardest bugs to find are the ones that appear silently over 6-12 hours. That's what this proves you've eliminated.

Good luck. 🚀
