/**
 * Sanity Studio configuration.
 *
 * This file is only used when Sanity is configured via env vars.
 * The studio is embedded at /studio and requires admin auth.
 */
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"
import { schemaTypes } from "./sanity/schemas"

const projectId = process.env["NEXT_PUBLIC_SANITY_PROJECT_ID"] ?? ""
const dataset = process.env["NEXT_PUBLIC_SANITY_DATASET"] ?? "production"

export default defineConfig({
  name: "festival-studio",
  title: "Festival CMS",
  projectId,
  dataset,
  plugins: [structureTool()],
  schema: { types: schemaTypes },
})
