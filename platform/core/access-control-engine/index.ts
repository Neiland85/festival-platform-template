/** 
 * Access Control Engine
 *
 * Este motor permite definir y evaluar reglas de acceso por evento e instancia.
 * Las reglas admiten listas blancas de emails/domains, tokens de invitación,
 * límites de compra por usuario e indicadores de visibilidad (public, unlisted, private, stealth).
 */

export type Visibility = "public" | "unlisted" | "private" | "stealth"

export interface AccessRule {
  allow?: string[]
  deny?: string[]
  maxPerUser?: number
  visibility?: Visibility
  tokenRequired?: boolean
}

export interface AccessContext {
  userEmail: string | null
  token?: string | null
  purchasedCount: number
}

/** 
 * Determina si un usuario puede acceder a un evento con la regla dada. 
 */
export function isAllowed(context: AccessContext, rule: AccessRule): boolean {
  if (rule.deny && context.userEmail && rule.deny.includes(context.userEmail)) {
    return false
  }
  if (rule.allow && context.userEmail && !rule.allow.includes(context.userEmail)) {
    return false
  }
  if (rule.tokenRequired && !context.token) {
    return false
  }
  if (rule.maxPerUser != null && context.purchasedCount >= rule.maxPerUser) {
    return false
  }
  return true
}
