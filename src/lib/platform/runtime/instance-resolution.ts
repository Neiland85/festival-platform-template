import path from "node:path"
import {
  loadInstanceByDomain,
  type LoadedInstance,
} from "../../../../platform/core/instance-config/instance-loader"

function normalizeHost(host: string | null): string | null {
  if (!host) return null

  const normalized = host
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(":")[0]

  return normalized || null
}

function getInstancesRoot(): string {
  return path.resolve(process.cwd(), "platform/instances")
}

export function resolveInstanceFromHost(host: string | null): LoadedInstance | null {
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) return null

  return loadInstanceByDomain(getInstancesRoot(), normalizedHost)
}

export function getInstanceHeaders(host: string | null): Record<string, string> | null {
  const instance = resolveInstanceFromHost(host)
  if (!instance) return null

  return {
    "x-instance-id": instance.instanceId,
    "x-instance-domain": instance.config.domain,
    "x-instance-locale": instance.config.locale,
    "x-instance-currency": instance.config.currency,
  }
}
