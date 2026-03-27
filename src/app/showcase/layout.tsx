import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Clarity Structures — Production-Grade Code Templates",
  description:
    "Enterprise security, battle-tested infrastructure, ready to deploy. White-label templates for live music festivals and events.",
}

export default function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
