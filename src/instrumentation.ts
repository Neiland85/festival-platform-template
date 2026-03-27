/**
 * Next.js Instrumentation Hook — OpenTelemetry integration.
 *
 * Initializes the OpenTelemetry SDK when OTEL_EXPORTER_OTLP_ENDPOINT is configured.
 * Graceful degradation: when not configured, the custom observability stack
 * (requestTracer, metricsCollector, etc.) continues to work as before.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env["OTEL_EXPORTER_OTLP_ENDPOINT"]) {
    const { initOtel } = await import("@/lib/observability/otel")
    initOtel()
  }
}
