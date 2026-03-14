/**
 * Sanity image URL builder.
 *
 * Provides a helper to generate optimized image URLs from Sanity
 * image references. Returns null if Sanity is not configured.
 */
import imageUrlBuilder from "@sanity/image-url"
import { sanityClient, isSanityConfigured } from "./client"
import type { SanityImage } from "./types"

const builder =
  isSanityConfigured && sanityClient
    ? imageUrlBuilder(sanityClient)
    : null

/**
 * Build an optimized image URL from a Sanity image reference.
 * Returns null if Sanity is not configured or image is missing.
 */
export function sanityImageUrl(
  image: SanityImage | undefined | null,
  width = 800,
): string | null {
  if (!builder || !image?.asset) return null

  return builder.image(image).width(width).auto("format").quality(80).url()
}
