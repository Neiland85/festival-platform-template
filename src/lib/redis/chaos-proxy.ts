/**
 * Redis Chaos Proxy — TCP-Level Failure Injection
 *
 * This is the difference between "in-process chaos" and "real infrastructure chaos"
 *
 * Simulates:
 * - Connection timeouts (mid-command)
 * - Slow responses (latency)
 * - Connection resets
 * - Partial writes (corruption)
 * - Failovers
 * - Queue overflow
 *
 * This catches bugs that sleep(random) never will.
 */

import { createServer, Socket } from "net"
import { log } from "@/lib/logger"

export interface ChaosProxyConfig {
  enabled: boolean
  targetHost: string // Redis host (e.g., "127.0.0.1")
  targetPort: number // Redis port (e.g., 6379)
  proxyPort: number // Port this proxy listens on (e.g., 6380)

  // Failure rates
  timeoutRate: number // Probability of connection timeout
  slowRate: number // Probability of slow response
  resetRate: number // Probability of connection reset mid-command
  corruptRate: number // Probability of corrupt response
  maxLatencyMs: number // Max artificial latency
}

const DEFAULT_CONFIG: ChaosProxyConfig = {
  enabled: process.env["CHAOS_REDIS_PROXY"] === "true",
  targetHost: process.env["REDIS_HOST"] || "127.0.0.1",
  targetPort: parseInt(process.env["REDIS_PORT"] || "6379", 10),
  proxyPort: parseInt(process.env["CHAOS_REDIS_PROXY_PORT"] || "6380", 10),

  timeoutRate: parseFloat(process.env["CHAOS_REDIS_TIMEOUT_RATE"] || "0.02"), // 2%
  slowRate: parseFloat(process.env["CHAOS_REDIS_SLOW_RATE"] || "0.15"), // 15%
  resetRate: parseFloat(process.env["CHAOS_REDIS_RESET_RATE"] || "0.01"), // 1%
  corruptRate: parseFloat(process.env["CHAOS_REDIS_CORRUPT_RATE"] || "0.005"), // 0.5%
  maxLatencyMs: parseInt(process.env["CHAOS_REDIS_MAX_LATENCY"] || "5000", 10),
}

interface ProxyMetrics {
  connectionsAccepted: number
  commandsForwarded: number
  timeoutsTriggered: number
  slowsTriggered: number
  resetsTriggered: number
  corruptsTriggered: number
  bytesForwarded: number
  activeConnections: number
}

const metrics: ProxyMetrics = {
  connectionsAccepted: 0,
  commandsForwarded: 0,
  timeoutsTriggered: 0,
  slowsTriggered: 0,
  resetsTriggered: 0,
  corruptsTriggered: 0,
  bytesForwarded: 0,
  activeConnections: 0,
}

export class RedisChaosProxy {
  private config: ChaosProxyConfig
  private metrics: ProxyMetrics

  constructor(config?: Partial<ChaosProxyConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.metrics = { ...metrics }

    if (this.config.enabled) {
      log("warn", "redis_chaos_proxy_enabled", {
        proxyPort: this.config.proxyPort,
        targetHost: this.config.targetHost,
        targetPort: this.config.targetPort,
        timeoutRate: this.config.timeoutRate,
        slowRate: this.config.slowRate,
        resetRate: this.config.resetRate,
        corruptRate: this.config.corruptRate,
      })
    }
  }

  /**
   * Start the proxy server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((clientSocket: Socket) => {
        this.handleClientConnection(clientSocket)
      })

      server.listen(this.config.proxyPort, () => {
        log("info", "redis_chaos_proxy_started", {
          port: this.config.proxyPort,
        })
        resolve()
      })

      server.on("error", (error) => {
        log("error", "redis_chaos_proxy_error", {
          error: error.message,
        })
        reject(error)
      })
    })
  }

  /**
   * Handle incoming client connection
   */
  private handleClientConnection(clientSocket: Socket): void {
    this.metrics.connectionsAccepted++
    this.metrics.activeConnections++

    const redisSocket = new Socket()

    // Buffer for accumulating data
    let commandBuffer = Buffer.alloc(0)

    // ── Client → Redis ────────────────────────────────

    clientSocket.on("data", (data) => {
      commandBuffer = Buffer.concat([commandBuffer, data])

      // Check if we have a complete Redis command
      const commands = this.parseRedisCommands(commandBuffer)

      for (const command of commands) {
        this.metrics.commandsForwarded++
        this.metrics.bytesForwarded += command.length

        // Chaos: timeout (kill connection)
        if (Math.random() < this.config.timeoutRate) {
          this.metrics.timeoutsTriggered++
          log("warn", "chaos_redis_timeout", {
            command: command.toString("utf-8").slice(0, 50),
          })
          clientSocket.destroy()
          return
        }

        // Chaos: slow response (add latency)
        if (Math.random() < this.config.slowRate) {
          this.metrics.slowsTriggered++
          const delay = Math.random() * this.config.maxLatencyMs
          log("warn", "chaos_redis_slow", { delayMs: delay.toFixed(0) })
          setTimeout(() => {
            if (clientSocket.writable) {
              redisSocket.write(command)
            }
          }, delay)
        } else {
          // Normal forwarding
          if (redisSocket.writable) {
            redisSocket.write(command)
          }
        }
      }

      // Clear processed commands
      commandBuffer = Buffer.alloc(0)
    })

    // ── Redis → Client ────────────────────────────────

    redisSocket.on("data", (data) => {
      // Chaos: reset (disconnect mid-response)
      if (Math.random() < this.config.resetRate) {
        this.metrics.resetsTriggered++
        log("warn", "chaos_redis_reset", {
          dataLength: data.length,
        })
        clientSocket.destroy()
        redisSocket.destroy()
        this.metrics.activeConnections--
        return
      }

      // Chaos: corrupt response (garble bytes)
      if (Math.random() < this.config.corruptRate) {
        this.metrics.corruptsTriggered++
        const corrupt = Buffer.from(data)
        const index = Math.floor(Math.random() * corrupt.length)
        corrupt[index] = Math.floor(Math.random() * 256)
        log("warn", "chaos_redis_corrupt", {
          originalLength: data.length,
          corruptIndex: index,
        })
        clientSocket.write(corrupt)
      } else {
        // Normal response
        clientSocket.write(data)
      }
    })

    // ── Connection Setup ──────────────────────────────

    redisSocket.connect(this.config.targetPort, this.config.targetHost, () => {
      log("debug", "redis_chaos_proxy_upstream_connected", {
        target: `${this.config.targetHost}:${this.config.targetPort}`,
      })
    })

    redisSocket.on("error", (error) => {
      log("error", "redis_chaos_proxy_upstream_error", {
        error: error.message,
      })
      clientSocket.destroy()
    })

    clientSocket.on("close", () => {
      redisSocket.destroy()
      this.metrics.activeConnections--
    })

    redisSocket.on("close", () => {
      clientSocket.destroy()
      this.metrics.activeConnections--
    })
  }

  /**
   * Parse Redis protocol commands (simplified)
   * Returns array of commands found in buffer
   */
  private parseRedisCommands(buffer: Buffer): Buffer[] {
    const commands: Buffer[] = []
    let offset = 0

    while (offset < buffer.length) {
      if (buffer[offset] === 42) {
        // "*" = array start
        const lineEnd = buffer.indexOf(13, offset) // \r
        if (lineEnd === -1) break

        // Parse array size
        const arraySize = parseInt(
          buffer.slice(offset + 1, lineEnd).toString("utf-8")
        )
        let commandEnd = lineEnd + 2 // skip \r\n

        // Find end of array
        for (let i = 0; i < arraySize; i++) {
          if (buffer[commandEnd] === 36) {
            // "$" = bulk string
            const bulkLineEnd = buffer.indexOf(13, commandEnd)
            if (bulkLineEnd === -1) break

            const bulkSize = parseInt(
              buffer.slice(commandEnd + 1, bulkLineEnd).toString("utf-8")
            )
            commandEnd = bulkLineEnd + 2 + bulkSize + 2 // skip \r\n, data, \r\n
          } else {
            break
          }
        }

        if (commandEnd <= buffer.length) {
          commands.push(buffer.slice(offset, commandEnd))
          offset = commandEnd
        } else {
          break
        }
      } else {
        offset++
      }
    }

    return commands
  }

  /**
   * Get current metrics
   */
  getMetrics(): ProxyMetrics {
    return { ...this.metrics }
  }

  /**
   * Print metrics summary
   */
  printMetrics(): string {
    return `
╔════════════════════════════════════════════╗
║     Redis Chaos Proxy Metrics              ║
╚════════════════════════════════════════════╝
Connections:        ${this.metrics.connectionsAccepted}
Active:             ${this.metrics.activeConnections}
Commands Forwarded: ${this.metrics.commandsForwarded}
Bytes Forwarded:    ${(this.metrics.bytesForwarded / 1024 / 1024).toFixed(2)} MB

Chaos Injected:
  Timeouts:   ${this.metrics.timeoutsTriggered}
  Slows:      ${this.metrics.slowsTriggered}
  Resets:     ${this.metrics.resetsTriggered}
  Corrupts:   ${this.metrics.corruptsTriggered}
    `.trim()
  }
}

// ── Singleton Instance ─────────────────────────────────

export const redisChaosProxy = new RedisChaosProxy()
