/**
 * DLQ Alert Delivery Adapters
 *
 * Pure transformation functions that convert DlqAlert objects into
 * channel-specific payloads (Slack, PagerDuty, plain text).
 *
 * No network calls. No SDK imports. Just data → data.
 *
 * Routing rules:
 *   P1 → PagerDuty + Slack
 *   P2 → Slack only
 *   (P3 never reaches here — filtered by generateAlerts)
 */

import type { DlqAlert } from "./dlq-alert-engine"
import { normalizeError } from "./dlq-alert-engine"

// ── Config ──────────────────────────────────────────────

/** Max correlationIds shown in payloads. Rest are summarized. */
const MAX_CORRELATION_IDS = 5

// ── Types ───────────────────────────────────────────────

export type SlackPayload = {
  channel: string
  blocks: SlackBlock[]
}

type SlackBlock =
  | { type: "header"; text: { type: "plain_text"; text: string; emoji: boolean } }
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "context"; elements: Array<{ type: "mrkdwn"; text: string }> }
  | { type: "divider" }

export type PagerDutyPayload = {
  routing_key: string
  event_action: "trigger"
  dedup_key: string
  payload: {
    summary: string
    severity: "critical" | "error" | "warning" | "info"
    source: string
    component: string
    custom_details: {
      severity: string
      eventType: string
      error: string
      normalizedError: string
      count: number
      correlationIds: string[]
      action: string
      reason: string
      dashboardUrl: string
    }
  }
}

export type PlainTextPayload = {
  subject: string
  body: string
}

export type DeliveryBatch = {
  slack: SlackPayload[]
  pagerduty: PagerDutyPayload[]
  plaintext: PlainTextPayload[]
}

// ── Truncation ──────────────────────────────────────────

function truncateIds(ids: string[], max = MAX_CORRELATION_IDS): string[] {
  if (ids.length <= max) return ids
  const shown = ids.slice(0, max)
  shown.push(`… and ${ids.length - max} more`)
  return shown
}

// ── Severity helpers ────────────────────────────────────

const SEVERITY_EMOJI: Record<string, string> = {
  P1: ":rotating_light:",
  P2: ":warning:",
}

const PD_SEVERITY: Record<string, "critical" | "error"> = {
  P1: "critical",
  P2: "error",
}

// ── Slack adapter ───────────────────────────────────────

export function toSlackPayload(alert: DlqAlert, channel = "#ops-alerts"): SlackPayload {
  const emoji = SEVERITY_EMOJI[alert.severity] ?? ":question:"
  const ids = truncateIds(alert.correlationIds)

  return {
    channel,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${alert.severity} DLQ Alert: ${alert.eventType}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: [
            `${emoji} *${alert.count} events* failed with the same error pattern`,
            "",
            `*Error:* \`${alert.error}\``,
            `*Action:* ${alert.action}`,
            `*Reason:* ${alert.reason}`,
            `*Dashboard:* <${alert.dashboardUrl}|View in admin>`,
          ].join("\n"),
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Correlation IDs:* ${ids.map((id) => `\`${id}\``).join(", ")}`,
          },
        ],
      },
      { type: "divider" },
    ],
  }
}

// ── PagerDuty adapter ───────────────────────────────────

export function toPagerDutyPayload(
  alert: DlqAlert,
  routingKey = "REPLACE_WITH_PD_ROUTING_KEY",
): PagerDutyPayload {
  const normalized = normalizeError(alert.error)

  return {
    routing_key: routingKey,
    event_action: "trigger",
    dedup_key: `dlq:${alert.eventType}:${normalized}`.slice(0, 255),
    payload: {
      summary: `[${alert.severity}] ${alert.count}x ${alert.eventType} failures: ${alert.error}`,
      severity: PD_SEVERITY[alert.severity] ?? "error",
      source: "dlq-alert-engine",
      component: "webhook-dlq",
      custom_details: {
        severity: alert.severity,
        eventType: alert.eventType,
        error: alert.error,
        normalizedError: normalized,
        count: alert.count,
        correlationIds: truncateIds(alert.correlationIds),
        action: alert.action,
        reason: alert.reason,
        dashboardUrl: alert.dashboardUrl,
      },
    },
  }
}

// ── Plain text adapter ──────────────────────────────────

export function toPlainText(alert: DlqAlert): PlainTextPayload {
  const ids = truncateIds(alert.correlationIds)

  const subject = `[${alert.severity}] DLQ: ${alert.count}x ${alert.eventType} failures`

  const body = [
    `Severity:    ${alert.severity}`,
    `Event Type:  ${alert.eventType}`,
    `Count:       ${alert.count}`,
    `Error:       ${alert.error}`,
    `Action:      ${alert.action}`,
    `Reason:      ${alert.reason}`,
    `Dashboard:   ${alert.dashboardUrl}`,
    "",
    "Correlation IDs:",
    ...ids.map((id) => `  - ${id}`),
  ].join("\n")

  return { subject, body }
}

// ── Batch router ────────────────────────────────────────

/**
 * Route alerts to the appropriate delivery channels.
 *
 * P1 → PagerDuty + Slack
 * P2 → Slack only
 */
export function buildDeliveryBatch(
  alerts: DlqAlert[],
  options?: { slackChannel?: string; pdRoutingKey?: string },
): DeliveryBatch {
  const batch: DeliveryBatch = {
    slack: [],
    pagerduty: [],
    plaintext: [],
  }

  for (const alert of alerts) {
    // Every alert gets a Slack payload and plain text
    batch.slack.push(toSlackPayload(alert, options?.slackChannel))
    batch.plaintext.push(toPlainText(alert))

    // P1 additionally triggers PagerDuty
    if (alert.severity === "P1") {
      batch.pagerduty.push(toPagerDutyPayload(alert, options?.pdRoutingKey))
    }
  }

  return batch
}
