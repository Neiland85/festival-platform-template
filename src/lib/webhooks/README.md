# Webhook Reliability System

Dead-letter queue, automated retry, alerting, and operator tooling for Stripe webhook processing.

## Architecture

```
Stripe ──► webhook handler ──► domain layer (completeOrder, cancelOrder)
                │                        │
                │ (success)              │ (throws)
                ▼                        ▼
           return 200          enqueueDeadLetter()
                               ┌────────────────────┐
                               │  PostgreSQL DLQ     │
                               │  webhook_dead_letters│
                               └────────┬───────────┘
                                        │
                          ┌─────────────┼──────────────┐
                          ▼             ▼              ▼
                   Auto-Retry      Admin API      Timeline
                    Worker        (resolve/retry)  Endpoint
                          │             │
                          ▼             ▼
                  Decision Engine ◄─────┘
                          │
                          ▼
                   Alert Engine
                   (group + filter)
                          │
                          ▼
                  Delivery Adapters
                  (Slack, PagerDuty)
                          │
                          ▼
                    Dispatcher
                  (retry + timeout)
```

## Modules

### `dead-letter-queue.ts` — Persistence layer

Stores failed webhook events in PostgreSQL. Fire-and-forget insert with internal `.catch()` — never blocks the webhook response.

**Key functions:**
- `enqueueDeadLetter()` — synchronous alert log + async DB insert
- `retryDeadLetter()` — re-executes domain handler with guards (max attempts, event type allowlist, idempotency)
- `resolveDeadLetter()` — marks entry as manually resolved
- `getDeadLettersByEventId()` — fetches all entries for a correlationId (timeline)

**Why it exists:** Stripe webhooks must return 200 quickly. If the domain handler fails, the event must not be lost. The DLQ persists it for later retry or manual resolution.

### `dlq-decision-engine.ts` — Triage rules

Pure function. No I/O. Maps a DLQ event to an operational decision.

```typescript
evaluateDlqEvent({ event, eventType, error, code }) → {
  severity: "P1" | "P2" | "P3",
  action: "retry" | "resolve" | "investigate" | "escalate",
  autoRetry: boolean,
  reason: string,
  runbook: string
}
```

**Rules encoded:**
- Revenue events (`checkout.session.completed`, `payment_intent.succeeded`) → P1
- Safe errors (`status is not reserved`, `already completed`) → P3, resolve immediately
- Transient errors (`ECONNREFUSED`, `connection timeout`) → auto-retry eligible
- DLQ persist failure → always P1, escalate
- Retry failure codes → mapped to specific actions

**Why it exists:** Operators and automation need consistent triage without reading runbook prose. One function, one answer.

### `dlq-auto-retry.ts` — Automated retry worker (v2)

Scans unresolved DLQ entries and retries those the decision engine classifies as safe.

**Safeguards:**
- Max 2 auto-retries per entry
- Exponential backoff: 1 min → 5 min
- Circuit breaker: skips all retries if DB pool utilization > 90%
- Global rate limit: max 10 retries per run
- Priority ordering: `checkout.session.completed` first

**Designed to be called from:** cron job, scheduled task, or admin endpoint. Has no internal scheduler.

**Why it exists:** Transient failures (DB timeout, connection reset) resolve themselves. Automated retry handles these without waking an operator at 3 AM.

### `dlq-alert-engine.ts` — Alert generation

Groups DLQ events by `(eventType + normalized error)` and produces de-duplicated alerts.

**Error normalization:** Strips UUIDs, Stripe IDs, numbers from error strings so `"Order not found: ord-abc"` and `"Order not found: ord-xyz"` land in the same group.

**Noise reduction:**
- Groups with < 3 events → dropped
- P3 groups → dropped
- Any P1 event in a group → entire group promoted to P1

**Memory bound:** `correlationIds` capped at 100 per group. `count` field tracks the true total.

**Why it exists:** 100 DLQ events from the same root cause should produce 1 alert, not 100.

### `dlq-alert-delivery.ts` — Payload adapters

Pure transformations. No network calls. Converts `DlqAlert` to channel-specific payloads.

- `toSlackPayload()` — Block Kit with header, section, context, divider
- `toPagerDutyPayload()` — Events API v2 with `dedup_key` for incident dedup
- `toPlainText()` — fallback for email or logs
- `buildDeliveryBatch()` — routes P1 → Slack + PagerDuty, P2 → Slack only

**`dedup_key`** is truncated to 255 chars (PagerDuty API limit). `correlationIds` truncated to 5 in payloads (full list stays in the `DlqAlert` object).

**Why it exists:** Separation of concerns. Alert content decisions happen here. Delivery reliability happens in the dispatcher.

### `dlq-alert-dispatcher.ts` — Network delivery

Sends payloads to Slack and PagerDuty with retry and timeout.

**Retry strategy:**
- 3 attempts total (1 initial + 2 retries)
- Backoff: 1s → 5s
- 5s fetch timeout via AbortController (covers headers AND body)
- Retry on: 5xx, 429, network errors
- Fail fast on: 4xx

**Idempotency:**
- PagerDuty: native `dedup_key` prevents duplicate incidents
- Slack: DJB2 hash of payload content prevents double-posts within a run

**Never throws.** All failures logged as `alert.dispatch_failed`.

**Why it exists:** Alert delivery is not on the critical path — but it must be reliable enough that operators actually get paged.

## API Endpoints

| Method | Path | Auth | CSRF | Purpose |
|--------|------|------|------|---------|
| GET | `/api/admin/dead-letters` | requireAdmin | — | List unresolved entries with status + decision |
| POST | `/api/admin/dead-letters/[id]/resolve` | requireAdmin | verifyCsrf | Mark entry resolved |
| POST | `/api/admin/dead-letters/[id]/retry` | requireAdmin | verifyCsrf | Retry domain handler |
| GET | `/api/admin/dead-letters/timeline/[correlationId]` | requireAdmin | — | Full event history |

## Key Design Decisions

### Idempotency

The domain layer enforces idempotency via `WHERE status = 'reserved'`. Calling `completeOrder()` twice for the same order is a no-op. This means:
- Auto-retry is safe
- Manual retry is safe
- Concurrent retries are safe (one wins, rest no-op)

### correlationId

`correlationId = Stripe eventId` (e.g., `evt_1abc...`). Every log, DLQ entry, timeline event, and alert carries this field. To trace a webhook failure end-to-end:

```
grep "evt_1abc" in Datadog/Loki
```

or:

```
GET /api/admin/dead-letters/timeline/evt_1abc
```

### Retry strategy (auto vs manual)

| | Auto-retry | Manual retry |
|---|---|---|
| **Trigger** | Worker (cron) | Operator (dashboard) |
| **Max attempts** | 2 | 5 (domain layer limit) |
| **Error types** | Transient only | Any |
| **Backoff** | 1 min → 5 min | Immediate |

### Alert grouping

Errors are normalized before grouping:
```
"Order not found: ord-abc123"  →  "order not found: <id>"
"Connection timeout after 30000ms"  →  "connection timeout after <n>ms"
```

This prevents alert storms. 500 failures from a DB outage produce 1 alert, not 500.

### CSRF on mutations

All POST endpoints verify `x-csrf-token` before `requireAdmin`. Order: CSRF (O(1), no DB) → Auth (session lookup) → Logic. Cheapest check first.

## Operational Model

### When a webhook fails

1. Domain handler throws → `enqueueDeadLetter()` fires
2. Synchronous `console.error` with `alert: true` for log aggregators
3. Async DB insert persists the entry
4. Auto-retry worker picks it up on next cycle (if eligible)
5. If auto-retry exhausts → entry awaits manual intervention
6. Operator sees it in dashboard with status badge and decision reason

### Dashboard states

| Badge | Meaning | Operator action |
|-------|---------|-----------------|
| `auto-retry pending` (blue) | System will retry automatically | Wait |
| `auto-retried (failed)` (orange) | Auto-retry exhausted | Investigate, then retry or resolve |
| `safe to resolve` (gray) | Idempotency guard fired — not a bug | Click resolve |
| `manual intervention required` (red) | Unknown error, needs investigation | Read error, check timeline, retry or escalate |

### Alert routing

| Severity | Slack | PagerDuty | Example |
|----------|-------|-----------|---------|
| P1 | Yes | Yes | checkout.session.completed failed with unknown error |
| P2 | Yes | No | checkout.session.expired failed with transient error |
| P3 | No | No | Safe error (already completed) |

## Runbooks

Runbooks are encoded in the decision engine (`dlq-decision-engine.ts`). Each decision includes a `runbook` field referencing:

- **RUNBOOK-1:** `webhook_processing_failed` — inspect dashboard, check safe errors table
- **RUNBOOK-2:** `dlq_persist_failed` — extract from logs, manual insert or Stripe replay
- **RUNBOOK-3:** `dlq.retry_failed` — action depends on failure code
- **RUNBOOK-4:** Backlog growth — check deploys, rollback or fix then drain
- **RUNBOOK-5:** `dlq_retry_update_failed` — verify order state, fix DLQ record

## Extending the System

### Adding a new retryable event type

1. Add to `RETRY_SAFE_EVENT_TYPES` in `dead-letter-queue.ts`
2. Add the handler branch in `retryDeadLetter()`
3. Ensure the domain handler is idempotent
4. Add tests

### Adding a new safe error pattern

1. Add to `SAFE_ERROR_PATTERNS` in `dlq-decision-engine.ts`
2. Decision engine automatically returns P3 + resolve
3. Add a test case

### Adding a new delivery channel

1. Add a type and adapter function in `dlq-alert-delivery.ts`
2. Add the channel to `buildDeliveryBatch()` routing
3. Add send logic in `dlq-alert-dispatcher.ts`
4. Follow the existing pattern: retry + timeout + structured logging

### Adding a new alert rule

1. Add a rule branch in `evaluateDlqEvent()` in `dlq-decision-engine.ts`
2. Return appropriate `severity`, `action`, `autoRetry`, `reason`, `runbook`
3. The alert engine, delivery, and dispatcher work unchanged

## File Map

```
src/lib/webhooks/
  dead-letter-queue.ts        # DLQ CRUD + retry logic (PostgreSQL)
  dlq-decision-engine.ts      # Pure triage rules
  dlq-auto-retry.ts           # Automated retry worker (v2)
  dlq-alert-engine.ts         # Alert grouping + noise reduction
  dlq-alert-delivery.ts       # Payload adapters (Slack, PD, text)
  dlq-alert-dispatcher.ts     # Network delivery with retry

src/app/api/admin/dead-letters/
  route.ts                    # GET list (with status + decision)
  [id]/resolve/route.ts       # POST resolve
  [id]/retry/route.ts         # POST retry
  timeline/[correlationId]/route.ts  # GET timeline

src/app/[locale]/dashboard/
  dead-letters/page.tsx       # Admin UI
```
