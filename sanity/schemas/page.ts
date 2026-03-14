import { defineField, defineType } from "sanity"

export const page = defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description: "URL path (e.g. 'privacidad', 'contacto')",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "object",
      fields: [
        { name: "es", title: "Español", type: "string" },
        { name: "en", title: "English", type: "string" },
      ],
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "object",
      fields: [
        {
          name: "es",
          title: "Español",
          type: "array",
          of: [{ type: "block" }],
        },
        {
          name: "en",
          title: "English",
          type: "array",
          of: [{ type: "block" }],
        },
      ],
    }),
    defineField({
      name: "seoDescription",
      title: "SEO Description",
      type: "object",
      fields: [
        { name: "es", title: "Español", type: "text", rows: 2 },
        { name: "en", title: "English", type: "text", rows: 2 },
      ],
    }),
  ],
  preview: {
    select: {
      title: "title.es",
      subtitle: "slug.current",
    },
  },
})
