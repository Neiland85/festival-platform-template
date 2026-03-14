import type { Lead } from "@/domain/leads/types"

const queue: Lead[] = []

export function enqueueLead(lead: Lead) {
  queue.push(lead)
}

export function dequeueLead(): Lead | undefined {
  return queue.shift()
}

export function queueSize() {
  return queue.length
}
