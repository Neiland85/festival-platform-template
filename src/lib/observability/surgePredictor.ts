type Bucket = {
  ts: number
  count: number
}

const WINDOW = 30
let buckets: Bucket[] = []

function getCurrentBucket(): Bucket {

  const now = Math.floor(Date.now() / 60000)

  const last = buckets[buckets.length - 1]

  if (!last || last.ts !== now) {

    const bucket = { ts: now, count: 0 }

    buckets.push(bucket)

    if (buckets.length > WINDOW) {
      buckets.shift()
    }

    return bucket
  }

  return last
}

export function recordLead() {
  const bucket = getCurrentBucket()
  bucket.count++
}

export function resetSurgePredictor() {
  buckets = []
}

export function getSurgeStatus() {

  const counts = buckets.map(b => b.count)

  const total = counts.reduce((a, b) => a + b, 0)

  const currentRate = counts[counts.length - 1] ?? 0

  const peak = Math.max(...counts, 0)

  let level = "NORMAL"

  if (currentRate >= 100) level = "SURGE"
  else if (currentRate >= 50) level = "HIGH"
  else if (currentRate >= 20) level = "ELEVATED"

  return {
    level,
    currentRate,
    peak,
    average: counts.length ? total / counts.length : 0,
    buckets: [...buckets].reverse(),
    collectedAt: new Date().toISOString()
  }
}

export function predict15m() {

  const counts = buckets.map(b => b.count)

  if (counts.length < 2) {
    return counts[counts.length - 1] ?? 0
  }

  const last = counts[counts.length - 1] ?? 0
  const prev = counts[counts.length - 2] ?? 0
  const gradient = last - prev

  let prediction = last + gradient * 15

  if (prediction < 0) prediction = 0
  if (prediction > 10000) prediction = 10000

  return prediction
}
