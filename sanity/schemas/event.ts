import { defineField, defineType, type Rule } from "sanity"

export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  fields: [
    defineField({
      name: "eventId",
      title: "Event ID",
      type: "string",
      description: "Unique slug identifier (e.g. 'chambao', 'bresh')",
      validation: (rule: Rule) => rule.required(),
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
      name: "highlight",
      title: "Highlight / Subtitle",
      type: "object",
      fields: [
        { name: "es", title: "Español", type: "string" },
        { name: "en", title: "English", type: "string" },
      ],
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "object",
      fields: [
        { name: "es", title: "Español", type: "text", rows: 3 },
        { name: "en", title: "English", type: "text", rows: 3 },
      ],
    }),
    defineField({
      name: "eventDate",
      title: "Event Date",
      type: "date",
    }),
    defineField({
      name: "time",
      title: "Time",
      type: "string",
      description: "e.g. '22:00h'",
    }),
    defineField({
      name: "ticketUrl",
      title: "Ticket URL",
      type: "url",
    }),
    defineField({
      name: "logo",
      title: "Event Logo / Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "priceCents",
      title: "Price (cents)",
      type: "number",
      description: "Price in euro cents (e.g. 2500 = €25.00). Leave empty for free events.",
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "sortOrder",
      title: "Sort Order",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "Sort Order",
      name: "sortOrder",
      by: [{ field: "sortOrder", direction: "asc" }],
    },
    {
      title: "Date",
      name: "eventDate",
      by: [{ field: "eventDate", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title.es",
      subtitle: "highlight.es",
      media: "logo",
    },
  },
})
