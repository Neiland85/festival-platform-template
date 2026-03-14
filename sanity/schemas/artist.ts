import { defineField, defineType } from "sanity"

export const artist = defineType({
  name: "artist",
  title: "Artist",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "object",
      fields: [
        { name: "es", title: "Español", type: "text", rows: 4 },
        { name: "en", title: "English", type: "text", rows: 4 },
      ],
    }),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "genre",
      title: "Genre",
      type: "string",
    }),
    defineField({
      name: "social",
      title: "Social Links",
      type: "object",
      fields: [
        { name: "instagram", title: "Instagram URL", type: "url" },
        { name: "spotify", title: "Spotify URL", type: "url" },
        { name: "website", title: "Website", type: "url" },
      ],
    }),
    defineField({
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "event" }],
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "genre",
      media: "photo",
    },
  },
})
