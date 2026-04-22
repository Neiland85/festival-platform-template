/**
 * SPUD campaign — pure prompt building, response parsing, validation.
 *
 * No I/O. OpenAI calls happen in the adapter layer.
 * Response format: JSON with { subject, body, reasoning }.
 */

import type { CampaignContext } from "./types"

/* ─── Constants ─── */

const MIN_SUBJECT_LENGTH = 5
const MAX_SUBJECT_LENGTH = 120
const MIN_BODY_LENGTH = 50
const MAX_BODY_LENGTH = 5000

/* ─── Prompt building ─── */

/**
 * Build the system prompt for campaign generation.
 * Focuses on conversion, urgency, and clear CTA.
 */
export function buildSystemPrompt(language: string): string {
  const langLabel = language === "es" ? "Spanish" : language === "ca" ? "Catalan" : "English"

  return `You are an expert email marketing copywriter specialized in event promotion and conversion optimization.

Your mission: generate high-converting email campaigns that drive ticket purchases.

Rules:
- Write in ${langLabel}
- Focus on urgency, scarcity, and clear call-to-action (CTA)
- Never invent data. Use ONLY the segment information provided.
- Subject line must grab attention and create urgency (max 120 chars)
- Body must include: hook, value proposition, social proof hint, CTA, urgency element
- Do NOT use generic marketing language. Be specific to the segment.
- Response MUST be valid JSON with this exact structure:
  { "subject": "...", "body": "...", "reasoning": "..." }
- "reasoning" explains your strategic choices (max 200 chars)
- Body should be plain text with line breaks (no HTML)`
}

/**
 * Build the user prompt with aggregated segment data.
 * Never includes individual lead data.
 */
export function buildUserPrompt(
  context: CampaignContext,
  tone: string,
): string {
  const parts: string[] = [
    `Segment: "${context.segmentName}"`,
    `Total leads: ${context.leadCount}`,
    `Tier distribution: ${context.tierDistribution}`,
    `Top sources: ${context.topSources}`,
    `Top professions: ${context.topProfessions}`,
  ]

  if (context.eventName) {
    parts.push(`Event: ${context.eventName}`)
  }
  if (context.eventType) {
    parts.push(`Event type: ${context.eventType}`)
  }

  parts.push(`Tone: ${tone}`)
  parts.push("")
  parts.push("Generate a campaign email for this segment.")
  parts.push('Respond with valid JSON: { "subject": "...", "body": "...", "reasoning": "..." }')

  return parts.join("\n")
}

/* ─── Response parsing ─── */

export interface ParsedCampaignResponse {
  subject: string
  body: string
  reasoning: string
}

/**
 * Parse the JSON response from the LLM.
 * Expects: { "subject": "...", "body": "...", "reasoning": "..." }
 */
export function parseCampaignResponse(raw: string): ParsedCampaignResponse {
  let parsed: unknown

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new CampaignParseError(`Invalid JSON response from LLM: ${raw.slice(0, 200)}`)
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new CampaignParseError("LLM response is not a JSON object")
  }

  const obj = parsed as Record<string, unknown>

  const subject = typeof obj["subject"] === "string" ? obj["subject"].trim() : ""
  const body = typeof obj["body"] === "string" ? obj["body"].trim() : ""
  const reasoning = typeof obj["reasoning"] === "string" ? obj["reasoning"].trim() : ""

  if (!subject || !body) {
    throw new CampaignParseError("LLM response missing subject or body")
  }

  return { subject, body, reasoning }
}

/* ─── Validation ─── */

/**
 * Validate that a draft meets minimum quality criteria.
 */
export function validateDraft(draft: ParsedCampaignResponse): void {
  if (draft.subject.length < MIN_SUBJECT_LENGTH) {
    throw new CampaignValidationError(
      `Subject too short (${draft.subject.length} chars, min ${MIN_SUBJECT_LENGTH})`,
    )
  }
  if (draft.subject.length > MAX_SUBJECT_LENGTH) {
    throw new CampaignValidationError(
      `Subject too long (${draft.subject.length} chars, max ${MAX_SUBJECT_LENGTH})`,
    )
  }
  if (draft.body.length < MIN_BODY_LENGTH) {
    throw new CampaignValidationError(
      `Body too short (${draft.body.length} chars, min ${MIN_BODY_LENGTH})`,
    )
  }
  if (draft.body.length > MAX_BODY_LENGTH) {
    throw new CampaignValidationError(
      `Body too long (${draft.body.length} chars, max ${MAX_BODY_LENGTH})`,
    )
  }
}

/**
 * Generate the memory key for a campaign draft.
 * Format: campaign:{segmentId}:{runId}
 */
export function campaignMemoryKey(segmentId: string, runId: string): string {
  return `campaign:${segmentId}:${runId}`
}

/* ─── Errors ─── */

export class CampaignParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CampaignParseError"
  }
}

export class CampaignValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CampaignValidationError"
  }
}
