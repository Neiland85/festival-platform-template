"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import { trackEvent } from "@/lib/tracking"

type FormState = "cta" | "rgpd" | "form" | "success" | "error"

export default function PromoFormSection() {
  const [state, setState] = useState<FormState>("cta")
  const [sending, setSending] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)

    const fd = new FormData(e.currentTarget)
    const email = fd.get("email") as string
    const name = fd.get("name") as string
    const surname = fd.get("surname") as string
    const phone = fd.get("phone") as string
    const profession = fd.get("profession") as string

    try {
      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          eventId: "promo-limitada",
          consentGiven: true,
          name,
          surname,
          phone,
          profession: profession || undefined,
          source: "promo-limitada",
        }),
      })

      if (!res.ok) throw new Error("fetch failed")

      trackEvent("lead", { email })
      setState("success")
    } catch {
      setState("error")
    } finally {
      setSending(false)
    }
  }, [])

  /* ─── CTA: Botón grande ─── */
  if (state === "cta") {
    return (
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <p className="text-xs font-medium tracking-[0.3em] uppercase opacity-50">
            Promoción verano 2026
          </p>

          <button
            onClick={() => setState("rgpd")}
            className="inline-block px-12 py-6 text-xl md:text-2xl font-bold tracking-wide
              uppercase border-4 border-white
              bg-white text-black
              hover:bg-transparent hover:text-white
              transition-all duration-300
              shadow-[0_0_40px_rgba(255,255,255,0.15)]"
          >
            Promociones limitadas
          </button>

          <p className="text-sm opacity-50 max-w-md mx-auto leading-relaxed">
            Consigue acceso a promociones exclusivas del festival
          </p>
        </div>
      </section>
    )
  }

  /* ─── RGPD: Consentimiento antes de recoger datos ─── */
  if (state === "rgpd") {
    return (
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
              Accede a promociones limitadas del festival
            </h3>
          </div>

          <div className="border border-white/20 p-6 md:p-8 space-y-5 text-sm leading-relaxed opacity-80">
            <p className="text-base font-medium text-white opacity-100">
              Protección de tus datos personales
            </p>

            <p>
              En Solaris Nerja nos comprometemos a proteger tu privacidad. Antes de
              continuar, queremos que sepas exactamente cómo tratamos tus datos:
            </p>

            <ul className="space-y-3 ml-1">
              <li className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-white opacity-100">&#10003;</span>
                <span>
                  <strong className="text-white opacity-100">
                    No vendemos ni compartimos tus datos
                  </strong>{" "}
                  con empresas externas, anunciantes ni terceros con fines comerciales.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-white opacity-100">&#10003;</span>
                <span>
                  <strong className="text-white opacity-100">
                    Solo usamos cookies técnicas y analíticas
                  </strong>{" "}
                  para mejorar tu experiencia de navegación. Las cookies de marketing
                  (Facebook Pixel, Google Analytics) solo se activan si tú las aceptas
                  expresamente en el banner de cookies.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-white opacity-100">&#10003;</span>
                <span>
                  <strong className="text-white opacity-100">
                    Tus datos se almacenan de forma segura
                  </strong>{" "}
                  en servidores europeos (Supabase/Vercel EU) con cifrado en tránsito y en
                  reposo.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-white opacity-100">&#10003;</span>
                <span>
                  <strong className="text-white opacity-100">
                    Usaremos tu email y teléfono únicamente
                  </strong>{" "}
                  para enviarte las promociones limitadas del festival
                  Solaris Nerja 2026.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 mt-0.5 text-white opacity-100">&#10003;</span>
                <span>
                  Puedes{" "}
                  <strong className="text-white opacity-100">
                    retirar tu consentimiento, acceder, rectificar o eliminar tus datos
                  </strong>{" "}
                  en cualquier momento contactándonos o ejerciendo tus derechos RGPD.
                </span>
              </li>
            </ul>

            <p className="text-xs opacity-60">
              Base legal: art. 6.1.a RGPD (consentimiento explícito). Responsable: Solaris
              Nerja.{" "}
              <Link href="/privacidad" className="underline hover:opacity-100 transition">
                Política de privacidad completa
              </Link>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setState("form")}
              className="px-10 py-4 text-sm font-bold tracking-widest uppercase
                bg-white text-black hover:bg-neutral-200 transition-colors"
            >
              Promociones limitadas
            </button>

            <button
              onClick={() => setState("cta")}
              className="px-10 py-4 text-sm font-medium tracking-widest uppercase
                border border-white/30 text-white/50
                hover:border-white/60 hover:text-white/80 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </section>
    )
  }

  /* ─── Formulario ─── */
  if (state === "form") {
    return (
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
              Promociones limitadas
            </h3>
            <p className="text-sm opacity-50">
              Rellena tus datos y recibirás las promociones en tu email
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label
                htmlFor="promo-name"
                className="text-xs font-medium tracking-wide uppercase opacity-70"
              >
                Nombre *
              </label>
              <input
                id="promo-name"
                name="name"
                type="text"
                required
                autoComplete="given-name"
                className="w-full bg-transparent border border-white/30 px-4 py-3 text-sm
                  text-white placeholder:text-white/30
                  focus:border-white focus:outline-none transition-colors"
                placeholder="Tu nombre"
              />
            </div>

            {/* Apellidos */}
            <div className="space-y-1.5">
              <label
                htmlFor="promo-surname"
                className="text-xs font-medium tracking-wide uppercase opacity-70"
              >
                Apellidos *
              </label>
              <input
                id="promo-surname"
                name="surname"
                type="text"
                required
                autoComplete="family-name"
                className="w-full bg-transparent border border-white/30 px-4 py-3 text-sm
                  text-white placeholder:text-white/30
                  focus:border-white focus:outline-none transition-colors"
                placeholder="Tus apellidos"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="promo-email"
                className="text-xs font-medium tracking-wide uppercase opacity-70"
              >
                Email *
              </label>
              <input
                id="promo-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-transparent border border-white/30 px-4 py-3 text-sm
                  text-white placeholder:text-white/30
                  focus:border-white focus:outline-none transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            {/* Teléfono */}
            <div className="space-y-1.5">
              <label
                htmlFor="promo-phone"
                className="text-xs font-medium tracking-wide uppercase opacity-70"
              >
                Teléfono *
              </label>
              <input
                id="promo-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                className="w-full bg-transparent border border-white/30 px-4 py-3 text-sm
                  text-white placeholder:text-white/30
                  focus:border-white focus:outline-none transition-colors"
                placeholder="+34 600 000 000"
              />
            </div>

            {/* Oficio (opcional) */}
            <div className="space-y-1.5">
              <label
                htmlFor="promo-profession"
                className="text-xs font-medium tracking-wide uppercase opacity-70"
              >
                Oficio <span className="opacity-50">(opcional)</span>
              </label>
              <input
                id="promo-profession"
                name="profession"
                type="text"
                autoComplete="organization-title"
                className="w-full bg-transparent border border-white/30 px-4 py-3 text-sm
                  text-white placeholder:text-white/30
                  focus:border-white focus:outline-none transition-colors"
                placeholder="Diseñador, músico, hostelería…"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={sending}
                className="flex-1 px-8 py-4 text-sm font-bold tracking-widest uppercase
                  bg-white text-black hover:bg-neutral-200
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending ? "Enviando…" : "Promociones limitadas"}
              </button>

              <button
                type="button"
                onClick={() => setState("rgpd")}
                className="px-6 py-4 text-xs font-medium tracking-widest uppercase
                  border border-white/20 text-white/40
                  hover:text-white/70 transition-colors"
              >
                Volver
              </button>
            </div>

            <p className="text-xs text-center opacity-40 pt-2">
              Al enviar, confirmas que has leído y aceptado nuestra{" "}
              <Link href="/privacidad" className="underline hover:opacity-80">
                política de privacidad
              </Link>
            </p>
          </form>
        </div>
      </section>
    )
  }

  /* ─── Success ─── */
  if (state === "success") {
    return (
      <section className="py-20 px-6 bg-black text-white">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <p className="text-5xl">&#127881;</p>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            ¡Estás dentro!
          </h3>
          <p className="text-sm opacity-60 max-w-md mx-auto leading-relaxed">
            Recibirás en tu email las promociones limitadas para Solaris
            Nerja 2026. Revisa tu bandeja de entrada.
          </p>
        </div>
      </section>
    )
  }

  /* ─── Error ─── */
  return (
    <section className="py-20 px-6 bg-black text-white">
      <div className="max-w-xl mx-auto text-center space-y-6">
        <p className="text-4xl">&#9888;&#65039;</p>
        <h3 className="text-2xl font-bold tracking-tight">Ha ocurrido un error</h3>
        <p className="text-sm opacity-60">
          No hemos podido procesar tu solicitud. Inténtalo de nuevo.
        </p>
        <button
          onClick={() => setState("form")}
          className="px-10 py-4 text-sm font-bold tracking-widest uppercase
            bg-white text-black hover:bg-neutral-200 transition-colors"
        >
          Reintentar
        </button>
      </div>
    </section>
  )
}

export function trackLead(data: Record<string, unknown>) {
  trackEvent("lead", data)
}
