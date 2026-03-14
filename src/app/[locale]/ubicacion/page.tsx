import { setRequestLocale } from "next-intl/server"

type Props = {
  params: Promise<{ locale: string }>
}

// TODO: Replace with your festival venue information
export default async function UbicacionPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="max-w-4xl mx-auto py-24 px-6 space-y-10">

      <h1 className="editorial-h2">
        Location
      </h1>

      <p className="text-lg leading-relaxed">
        The festival takes place at Your Venue, one of the most
        spectacular locations in Your Region.
      </p>

      <p>
        The venue spans a large area and includes concert zones,
        gastronomy, creative market, and cultural spaces.
      </p>

      <div className="aspect-video bg-[var(--sn-surface)] border border-[var(--sn-border)] flex items-center justify-center">
        <p className="text-sm text-[var(--sn-muted)]">
          map coming soon
        </p>
      </div>

    </div>
  )
}
