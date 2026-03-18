# Queue Reconciliation Setup

## Overview

The reconciliation endpoint recovers stale jobs from the processing queue when workers crash. It MUST run periodically (every 60-120 seconds) or jobs will get stuck forever.

**Endpoint:** `POST /api/queue/reconcile`

**Required Environment Variable:** `QUEUE_RECONCILE_KEY`

## Setup Instructions

### 1. Set Environment Variable

```bash
# .env.local or production env vars
QUEUE_RECONCILE_KEY=your-secret-key-here
```

### 2. Choose a Scheduler

#### Option A: Vercel Cron (Recommended for Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/queue/reconcile",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

This runs every 2 minutes automatically.

**Note:** Requires Vercel Pro or higher.

---

#### Option B: Upstash (Works Everywhere)

1. Create Upstash Qstash account: https://console.upstash.com
2. In Qstash console, create new Scheduled Message:
   - URL: `https://yourapp.com/api/queue/reconcile`
   - Header: `Authorization: Bearer YOUR_QUEUE_RECONCILE_KEY`
   - Schedule: Every 2 minutes (`*/2 * * * *`)

CLI example:
```bash
curl -X POST \
  -H "Authorization: Bearer $QSTASH_TOKEN" \
  -d '{
    "destination": "https://yourapp.com/api/queue/reconcile",
    "cron": "*/2 * * * *",
    "headers": {
      "Authorization": "Bearer '"$QUEUE_RECONCILE_KEY"'"
    }
  }' \
  https://api.upstash.com/v1/publish
```

---

#### Option C: AWS Lambda + EventBridge

Create Lambda function:

```python
import boto3
import urllib3

def lambda_handler(event, context):
    http = urllib3.PoolManager()
    url = os.environ['QUEUE_RECONCILE_URL']
    key = os.environ['QUEUE_RECONCILE_KEY']

    response = http.request(
        'POST',
        url,
        headers={'Authorization': f'Bearer {key}'}
    )

    return {'statusCode': response.status}
```

Create EventBridge rule:
- Pattern: Schedule expression `rate(2 minutes)`
- Target: Lambda function

---

#### Option D: Self-Hosted (Node.js + Node Scheduler)

```typescript
// scripts/reconciliation-scheduler.ts
import { schedule } from 'node-schedule'
import { reconcileProcessing } from '@/lib/security/redisQueue'

// Run every 2 minutes
schedule('*/2 * * * *', async () => {
  console.log('[Scheduler] Running reconciliation...')
  const result = await reconcileProcessing()
  console.log(`[Scheduler] Recovered: ${result.recovered}, Failed: ${result.failed}`)
})

console.log('Queue reconciliation scheduler started')
```

Run as separate process:
```bash
npx ts-node scripts/reconciliation-scheduler.ts
```

---

## Verification

### Test the Endpoint Manually

```bash
# Check endpoint is accessible
curl https://yourapp.com/api/queue/reconcile

# Run reconciliation with auth
curl -X POST \
  -H "Authorization: Bearer $QUEUE_RECONCILE_KEY" \
  https://yourapp.com/api/queue/reconcile
```

Expected response:
```json
{
  "success": true,
  "recovered": 0,
  "failed": 0,
  "durationMs": 45,
  "timestamp": "2026-03-18T20:00:00Z"
}
```

### Monitor Reconciliation Logs

Check logs for reconciliation execution:

```bash
# View recent reconciliation runs
grep -i reconciliation /var/log/app.log

# Should see entries like:
# [INFO] reconciliation_completed recovered=0 failed=0 durationMs=45
```

### Set Up Alerts

If reconciliation fails or queue depth grows:

```typescript
// In your monitoring system (Sentry, DataDog, etc.)
if (result.failed > 0) {
  Sentry.captureMessage('Queue reconciliation: jobs moved to DLQ', 'warning')
}

if (queueDepth > 500) {
  alert('Queue backlog exceeds 500 items')
}
```

---

## Critical Details

### 1. Frequency

- **Minimum:** Every 5 minutes (allows crashed worker lease to expire: 5min)
- **Recommended:** Every 2 minutes (balance between overhead and recovery speed)
- **Maximum:** Every 1 minute (diminishing returns, more overhead)

### 2. Authorization

ALWAYS protect with API key. In production:

```typescript
// .env.production
QUEUE_RECONCILE_KEY=abc123defgh-long-secret-key-xyz

// Don't commit this value
```

### 3. Timeout

Set HTTP timeout to 60 seconds minimum:

```typescript
export const maxDuration = 60 // Vercel
```

If queue is very large (10k+ items), increase to 120 seconds.

### 4. Safety

Reconciliation is completely safe to run repeatedly:
- Idempotent (running twice has same effect as once)
- Won't duplicate jobs (Postgres status checked first)
- Won't lose data (Postgres is source of truth)

---

## Troubleshooting

### Reconciliation never runs

**Check:**
1. Cron job is enabled in Vercel/Upstash/etc.
2. Logs show `reconciliation_completed` entries
3. `QUEUE_RECONCILE_KEY` is set and matches endpoint

### Jobs stuck in processing forever

**Causes:**
1. Reconciliation not running → stale leases never detected
2. Worker crashes but never actually happened → lease renews

**Fix:**
1. Verify reconciliation is running (check logs)
2. Manually trigger: `curl -X POST ... /api/queue/reconcile`
3. Check Redis: `LRANGE platform:queue:processing 0 -1`

### Queue depth growing

**Causes:**
1. Reconciliation running but can't move jobs back to pending (DB error)
2. Too many failures → jobs moving to DLQ
3. Enqueue rate > dequeue rate

**Check:**
1. Reconciliation logs for errors
2. DLQ size: `LLEN platform:queue:failed`
3. Dequeue rate: monitor worker throughput

---

## Performance Impact

- **CPU:** Negligible (<1% per run)
- **DB:** Light query load (1-2 queries per stale job)
- **Redis:** Single LRANGE scan + multiple HGET/DEL ops
- **Duration:** ~20-50ms typical queue, ~100-500ms for large queues (10k+ items)

Safe to run every 2 minutes without performance impact.
