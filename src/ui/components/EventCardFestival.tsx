"use client"

import Image from "next/image"
import SunriseButton from "@/ui/components/SunriseButton"

type Props = {
  id: string
  title: string
  highlight: string
  ticketUrl: string
  logo?: string
  eventDate?: string
  colorIndex?: number
  /** Background artist photo shown with opacity; reveals on hover. */
  artistImage?: string
  /** CSS object-position for the artist image (default: "center 25%"). */
  artistImagePosition?: string
  /** CSS object-fit override (default: "cover"). Use "contain" for logos/posters. */
  artistImageFit?: "cover" | "contain"
  /** Background color for the image zone (useful with contain to fill empty space). */
  artistImageBg?: string
  /** When provided, SunriseButton click opens ArtistModal instead of direct URL. */
  onSelect?: () => void
}

export default function EventCardFestival({
  id,
  title,
  highlight,
  ticketUrl,
  logo,
  eventDate,
  colorIndex = 0,
  artistImage,
  artistImagePosition,
  artistImageFit = "cover",
  artistImageBg,
  onSelect,
}: Props) {
  const hasRealUrl = ticketUrl && ticketUrl !== "#"

  return (
    <div className="group relative overflow-hidden border border-(--sn-border) bg-[var(--sn-bg)] flex flex-col items-center text-center transition-colors duration-700">
      {/* ── Artist portrait zone: face visible, not covered by content ── */}
      {artistImage && (
        <div
          className="relative w-full h-72 sm:h-80 overflow-hidden"
          style={artistImageBg ? { backgroundColor: artistImageBg } : undefined}
        >
          <div
            className="absolute inset-0 transition-all duration-700 ease-out
              opacity-20 scale-105 grayscale
              group-hover:opacity-50 group-hover:scale-110 group-hover:grayscale-0"
          >
            <Image
              src={artistImage}
              alt={title}
              fill
              sizes="(max-width: 768px) 90vw, 420px"
              className={artistImageFit === "contain" ? "object-contain p-6" : "object-cover"}
              style={{ objectPosition: artistImagePosition ?? "center 25%" }}
            />
          </div>
          {/* Solar glow on hover — radial burst from behind the face */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-700
              opacity-0 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(255,51,0,0.25) 0%, rgba(65,65,198,0.08) 50%, transparent 80%)",
            }}
          />
          {/* Bottom fade into card content */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
            style={{
              background: "linear-gradient(to top, var(--sn-bg), transparent)",
            }}
          />
        </div>
      )}

      {/* ── Card content ── */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 w-full p-6">
        {logo && (
          <div className="h-20 w-full relative">
            <Image
              src={logo}
              alt={title}
              fill
              sizes="(max-width: 768px) 90vw, 320px"
              className="object-contain"
            />
          </div>
        )}

        {eventDate && (
          <p className="text-sm text-(--sn-muted) tracking-wide">
            {new Date(eventDate).toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "long",
            })}
          </p>
        )}

        <div>
          <p className="text-lg font-medium tracking-wide">{title}</p>

          <p className="text-sm text-(--sn-muted)">{highlight}</p>
        </div>

        {hasRealUrl ? (
          <>
            <SunriseButton
              artistName={title}
              href={ticketUrl}
              colorIndex={colorIndex}
              onSelect={onSelect}
            />
            <a
              href={ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border-2 border-[var(--sn-text)] px-6 py-2 text-sm font-medium tracking-wide hover:bg-[var(--sn-text)] hover:text-[var(--sn-bg)] transition"
            >
              comprar entradas
            </a>
          </>
        ) : (
          <a
            href={`/eventos/${encodeURIComponent(id)}`}
            className="inline-block border-2 border-[var(--sn-border-2)] px-6 py-2 text-sm font-medium tracking-wide text-(--sn-muted) hover:border-[var(--sn-text)] hover:text-[var(--sn-text)] transition"
          >
            más información
          </a>
        )}
      </div>
    </div>
  )
}
