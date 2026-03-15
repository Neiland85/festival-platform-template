/** In-memory burst queue — generic payload */

type QueueItem = Record<string, unknown>

const queue: QueueItem[] = []

export function enqueue(item: QueueItem) {
  queue.push(item)
}

export function dequeue(): QueueItem | undefined {
  return queue.shift()
}

export function queueSize() {
  return queue.length
}
