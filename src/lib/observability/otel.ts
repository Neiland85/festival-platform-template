/**
 * OpenTelemetry SDK initialization — opt-in via OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * Uses only HTTP exporter (no gRPC) to avoid `net` module dependency
 * which is unavailable in Vercel/Next.js edge runtime.
 *
 * When not configured, the custom observability modules continue to work.
 *
 * Usage: Called from src/instrumentation.ts at app startup.
 */

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions"

let provider: NodeTracerProvider | null = null

export function initOtel(): void {
  if (provider) return // Already initialized

  const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]
  if (!endpoint) return

  const exporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "festival-platform",
      [ATTR_SERVICE_VERSION]: process.env["npm_package_version"] ?? "0.0.0",
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  })

  provider.register()

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
    provider?.shutdown().catch(console.error)
  })
}
