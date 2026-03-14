"use client"

/**
 * Sanity Studio embedded page.
 *
 * Rendered at /studio. The studio is only functional when
 * NEXT_PUBLIC_SANITY_PROJECT_ID is configured.
 * Access is protected by admin auth in middleware.ts.
 */
import { NextStudio } from "next-sanity/studio"
import config from "../../../../sanity.config"

export default function StudioPage() {
  return <NextStudio config={config} />
}
