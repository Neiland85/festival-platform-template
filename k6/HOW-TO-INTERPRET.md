# k6 JSON Results — How to Interpret & Configure Thresholds

## 1. Running and exporting results

```bash
# Smoke test — quick sanity check
K6_PROFILE=smoke k6 run --summary-export=results.json k6/homepage.js

# Load test against staging
K6_PROFILE=load k6 run \
  -e BASE_URL=https://staging.festival.example.com \
  --summary-export=results.json \
  k6/homepage.js

# Full raw output (for Grafana/Prometheus ingestion)
K6_PROFILE=load k6 run \
  --out json=raw-output.json.gz \
  --summary-export=summary.json \
  k6/homepage.js
```

## 2. Understanding the JSON summary

The `--summary-export` JSON has this structure:

```json
{
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "contains": "time",
      "values": {
        "avg": 142.56,
        "min": 23.1,
        "med": 128.4,
        "max": 1892.3,
        "p(90)": 312.7,
        "p(95)": 487.2,
        "p(99)": 1245.6
      },
      "thresholds": {
        "p(95)<500": { "ok": true },
        "p(99)<1500": { "ok": true }
      }
    },
    "http_req_failed": {
      "type": "rate",
      "contains": "default",
      "values": {
        "rate": 0.003,
        "passes": 3,
        "fails": 997
      },
      "thresholds": {
        "rate<0.01": { "ok": true }
      }
    },
    "http_reqs": {
      "type": "counter",
      "contains": "default",
      "values": {
        "count": 1000,
        "rate": 16.7
      }
    },
    "iterations": {
      "type": "counter",
      "contains": "default",
      "values": {
        "count": 500,
        "rate": 8.33
      }
    },
    "data_received": {
      "type": "counter",
      "contains": "data",
      "values": {
        "count": 52428800,
        "rate": 873813.3
      }
    }
  }
}
```

## 3. Key metrics to check

| Metric | Field | SLO Target | What it means |
|--------|-------|------------|---------------|
| `http_req_duration` | `values.p(95)` | < 500ms | 95% of requests completed under this time |
| `http_req_duration` | `values.p(99)` | < 1500ms | 99% of requests — catches tail latency |
| `http_req_duration` | `values.avg` | informational | Average response time (less useful than percentiles) |
| `http_req_failed` | `values.rate` | < 0.01 (1%) | Fraction of requests that returned 4xx/5xx |
| `http_reqs` | `values.rate` | > 10 req/s | Throughput — requests per second |
| `iterations` | `values.count` | — | Total completed VU iterations |
| `data_received` | `values.count` | — | Total bytes received (divide by 1048576 for MB) |

## 4. Quick parse with jq

```bash
# One-liner: extract key SLO metrics
jq '{
  p95_ms:     .metrics.http_req_duration.values["p(95)"],
  p99_ms:     .metrics.http_req_duration.values["p(99)"],
  avg_ms:     .metrics.http_req_duration.values.avg,
  error_rate: .metrics.http_req_failed.values.rate,
  req_per_s:  .metrics.http_reqs.values.rate,
  total_reqs: .metrics.http_reqs.values.count,
  all_pass:   ([.metrics[].thresholds // {} | to_entries[] | .value.ok] | all)
}' results.json
```

Example output:
```json
{
  "p95_ms": 487.2,
  "p99_ms": 1245.6,
  "avg_ms": 142.56,
  "error_rate": 0.003,
  "req_per_s": 16.7,
  "total_reqs": 1000,
  "all_pass": true
}
```

## 5. Threshold syntax reference

Thresholds are defined in `k6/config.js` per profile. Syntax:

```javascript
thresholds: {
  // Trend metrics (http_req_duration): percentile checks
  http_req_duration: [
    "p(95)<500",    // 95th percentile under 500ms
    "p(99)<1500",   // 99th percentile under 1500ms
    "avg<300",      // Average under 300ms
    "max<5000",     // No single request over 5s
  ],

  // Rate metrics (http_req_failed): rate checks
  http_req_failed: [
    "rate<0.01",    // Less than 1% failure rate
  ],

  // Counter metrics (http_reqs): rate checks
  http_reqs: [
    "rate>10",      // At least 10 requests/second throughput
    "count>100",    // At least 100 total requests completed
  ],
}
```

### Abort-on-threshold

Add `abortOnFail` to stop the test early if SLO is already breached:

```javascript
thresholds: {
  http_req_duration: [
    { threshold: "p(95)<500", abortOnFail: true, delayAbortEval: "30s" },
  ],
}
```

`delayAbortEval` gives the system 30s to warm up before enforcing.

## 6. CI integration — reading results programmatically

The GitHub Action (`k6.yml`) exports results as artifacts. To check pass/fail in CI:

```bash
# k6 exits non-zero if ANY threshold fails.
# The workflow captures this exit code.
# In summary.txt, look for:
#   "all_pass": true   → green
#   "all_pass": false  → investigate which threshold breached
```

To compare runs over time, download artifacts from previous runs:

```bash
gh run download <run-id> -n k6-results-load-42
jq '.metrics.http_req_duration.values["p(95)"]' k6/results/homepage-*.json
```

## 7. Decision matrix: which profile when?

| Scenario | Profile | When |
|----------|---------|------|
| PR merge to main | `smoke` | Quick validation, < 1 min |
| Pre-release staging | `load` | Sustained traffic simulation, ~5 min |
| Capacity planning / pre-event | `stress` | Find the ceiling, ~8 min |
| Incident investigation | `smoke` against prod | Verify fix deployed correctly |

## 8. Connecting to Prometheus / Grafana

For continuous monitoring (not just CI), output k6 metrics to Prometheus:

```bash
K6_PROMETHEUS_RW_SERVER_URL=http://prometheus:9090/api/v1/write \
k6 run --out experimental-prometheus-rw k6/homepage.js
```

Then import `observability/grafana-panel-example.json` into Grafana for
the pre-built dashboard with p50/p95/p99 panels and error rate visualization.

Alert rules in `observability/prometheus-alerts.yml` fire when:
- `p95 > 500ms` for 5 min → warning
- `p95 > 1500ms` for 3 min → critical
- `error_rate > 1%` for 5 min → warning
- `error_rate > 5%` for 3 min → critical
