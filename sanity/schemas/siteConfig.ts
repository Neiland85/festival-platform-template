import { defineField, defineType } from "sanity"

export const siteConfig = defineType({
  name: "siteConfig",
  title: "Site Configuration",
  type: "document",
  fields: [
    defineField({
      name: "festivalName",
      title: "Festival Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "object",
      fields: [
        { name: "es", title: "Español", type: "string" },
        { name: "en", title: "English", type: "string" },
      ],
    }),
    defineField({
      name: "dates",
      title: "Festival Dates",
      type: "object",
      fields: [
        { name: "start", title: "Start Date", type: "date" },
        { name: "end", title: "End Date", type: "date" },
      ],
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "heroVideo",
      title: "Hero Video URL",
      type: "url",
      description: "URL to the hero section video (or leave empty to use /hero/hero.mp4)",
    }),
    defineField({
      name: "social",
      title: "Social Media Links",
      type: "object",
      fields: [
        { name: "instagram", title: "Instagram", type: "url" },
        { name: "facebook", title: "Facebook", type: "url" },
        { name: "youtube", title: "YouTube", type: "url" },
        { name: "tiktok", title: "TikTok", type: "url" },
      ],
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "object",
      fields: [
        { name: "venueName", title: "Venue Name", type: "string" },
        { name: "city", title: "City", type: "string" },
        { name: "region", title: "Region", type: "string" },
        { name: "mapsEmbedUrl", title: "Google Maps Embed URL", type: "url" },
      ],
    }),
  ],
  preview: {
    select: { title: "festivalName" },
  },
})
