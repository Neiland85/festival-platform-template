/**
 * OpenAI client — lazy singleton, graceful degradation.
 *
 * Pattern identical to adapters/payments/stripe/client.ts:
 * - Returns null if OPENAI_API_KEY is not configured
 * - requireOpenAI() throws if not configured (for routes that need it)
 * - generateChatCompletion() is the single entry point for LLM calls
 */

import OpenAI from "openai"
import { serverEnv } from "@/lib/env"

let client: OpenAI | null = null

export class OpenAINotConfiguredError extends Error {
  constructor() {
    super("OpenAI is not configured. Set OPENAI_API_KEY in your environment.")
    this.name = "OpenAINotConfiguredError"
  }
}

/**
 * Get the OpenAI client singleton. Returns null if not configured.
 */
export function getOpenAIClient(): OpenAI | null {
  if (!serverEnv.OPENAI_API_KEY) return null

  if (!client) {
    client = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY })
  }

  return client
}

/**
 * Get the OpenAI client or throw. Use in routes that require it.
 */
export function requireOpenAI(): OpenAI {
  const c = getOpenAIClient()
  if (!c) throw new OpenAINotConfiguredError()
  return c
}

/**
 * Generate a chat completion. Single entry point for all LLM calls.
 *
 * @param systemPrompt — sets the assistant's behavior
 * @param userPrompt   — the user message with context
 * @param opts         — temperature (default 0.7), maxTokens (default 1024)
 * @returns raw text response from the model
 */
export async function generateChatCompletion(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const openai = requireOpenAI()
  const model = serverEnv.OPENAI_MODEL ?? "gpt-4o-mini"

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.maxTokens ?? 1024,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("OpenAI returned empty response")
  }

  return content
}
