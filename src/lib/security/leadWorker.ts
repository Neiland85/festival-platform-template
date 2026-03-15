/**
 * Generic queue worker — processes items from the queue facade.
 *
 * Override `processItem` with your domain-specific logic.
 * Currently a no-op placeholder for the marketplace pivot.
 */
import { dequeue } from "./queueFacade"
import * as Sentry from "@sentry/nextjs"

let running = false

export async function processQueue() {
  if (running) return
  running = true

  try {
    const item = await dequeue()
    if (!item) {
      running = false
      return
    }

    // TODO: Replace with domain-specific processing
    console.log("Queue item processed:", item)
  } catch (err) {
    console.error("queue worker error", err)
    Sentry.captureException(err, { tags: { module: "queueWorker" } })
  } finally {
    running = false
  }
}
