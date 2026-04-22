import { headers } from "next/headers"

export interface RequestInstanceContext {
  instanceId: string
  domain: string
  locale: string
  currency: string
}

export async function getRequestInstance(): Promise<RequestInstanceContext | null> {
  const headerStore = await headers()

  const instanceId = headerStore.get("x-instance-id")
  const domain = headerStore.get("x-instance-domain")
  const locale = headerStore.get("x-instance-locale")
  const currency = headerStore.get("x-instance-currency")

  if (!instanceId || !domain || !locale || !currency) {
    return null
  }

  return {
    instanceId,
    domain,
    locale,
    currency,
  }
}
