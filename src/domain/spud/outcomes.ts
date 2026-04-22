/**
 * SPUD outcomes — pure snapshot builder for conversion tracking.
 *
 * No I/O. Persistence is in the repository layer.
 */

import type { ConversionSnapshot, Tier } from "./types"

/**
 * Build a conversion snapshot for a lead that completed an order.
 * Captures the lead's score and tier at the moment of conversion.
 */
export function buildConversionSnapshot(
  leadId: string,
  orderId: string,
  currentScore: { score: number; tier: Tier } | null,
): ConversionSnapshot {
  return {
    leadId,
    orderId,
    scoreAtConversion: currentScore?.score ?? null,
    tierAtConversion: currentScore?.tier ?? null,
  }
}
