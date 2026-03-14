import { setRequestLocale } from "next-intl/server"

// TODO: Replace contact emails and content with your festival info
export const metadata = {
  title: "Contact | Festival",
  description:
    "Contact the festival organization. Get in touch for partnerships, press, and collaborations."
}

type Props = {
  params: Promise<{ locale: string }>
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="max-w-3xl mx-auto py-24 px-6 space-y-12">

      <h1 className="editorial-h2">
        Information & Contact
      </h1>

      <div className="space-y-4">

        <p>
          Want to participate with your brand at the festival market?
        </p>

        <p className="font-medium">
          hello@your-festival.com
        </p>

      </div>

      <div className="space-y-4">

        <p>
          Sponsors, press, and collaborations
        </p>

        <p className="font-medium">
          press@your-festival.com
        </p>

      </div>

    </div>
  )
}
