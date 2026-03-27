/**
 * OpenTelemetry SDK initialization — opt-in via OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * Configures distributed tracing with OTLP HTTP exporter.
 * When not configured, the custom observability modules continue to work.
 *
 * Usage: Called from src/instrumentation.ts at app startup.
 */

import { NodeSDK } from "@opentelemetry/sdk-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { Resource } from "@opentelemetry/resources"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"

let sdk: NodeSDK | null = null

export function initOtel(): void {
  if (sdk) return // Already initialized

  const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]
  if (!endpoint) return

  const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: "festival-platform",
      [ATTR_SERVICE_VERSION]: process.env["npm_package_version"] ?? "0.0.0",
    }),
    traceExporter: exporter,
  })

  sdk.start()

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "otel_initialized",
      endpoint,
    }),
  )

  // Graceful shutdown
  process.on("SIGTERM", () => {
    sdk?.shutdown().catch(console.error)
  })
}
