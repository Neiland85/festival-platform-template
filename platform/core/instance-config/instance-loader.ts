import fs from "node:fs"
import path from "node:path"
import { InstanceConfigSchema, type InstanceConfig } from "./config.schema"
import { InstanceRulesSchema, type InstanceRules } from "./rules.schema"

export interface LoadedInstance {
  instanceId: string
  config: InstanceConfig
  rules: InstanceRules
}

function readJsonFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf8")
  return JSON.parse(raw)
}

export function loadInstanceFromDirectory(instanceDir: string): LoadedInstance {
  const instanceId = path.basename(instanceDir)

  const configPath = path.join(instanceDir, "config.json")
  const rulesPath = path.join(instanceDir, "rules.json")

  const configRaw = readJsonFile(configPath)
  const rulesRaw = readJsonFile(rulesPath)

  const config = InstanceConfigSchema.parse(configRaw)
  const rules = InstanceRulesSchema.parse(rulesRaw)

  return {
    instanceId,
    config,
    rules
  }
}

export function loadInstanceByDomain(instancesRoot: string, domain: string): LoadedInstance | null {
  const entries = fs.readdirSync(instancesRoot, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const instanceDir = path.join(instancesRoot, entry.name)
    const loaded = loadInstanceFromDirectory(instanceDir)

    if (loaded.config.domain === domain) {
      return loaded
    }
  }

  return null
}
