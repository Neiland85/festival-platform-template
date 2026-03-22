import type { Metadata } from "next"
import Link from "next/link"
import { setRequestLocale } from "next-intl/server"
import { CONTACT_EMAIL } from "@/config/site"

export const metadata: Metadata = {
  title: "Política de Privacidad — Festival Platform",
  description: "Política de privacidad y protección de datos de Festival Platform.",
}

type Props = {
  params: Promise<{ locale: string }>
}

export default async function PrivacidadPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main className="min-h-screen">
      <section className="px-6 md:px-12 pt-16 pb-24 max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-xs font-medium tracking-widest uppercase text-[var(--sn-muted)]
            hover:text-[var(--sn-text)] transition-colors"
        >
          ← Inicio
        </Link>

        <h1 className="mt-8 text-4xl md:text-5xl font-bold tracking-tight">
          Política de Privacidad
        </h1>
        <p className="mt-2 text-xs text-[var(--sn-muted)]">
          Última actualización: marzo 2026
        </p>

        <div className="mt-12 space-y-10 text-[var(--sn-muted)] leading-relaxed text-sm">

          {/* ── 1. Responsable ────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              1. Responsable del tratamiento
            </h2>
            <p>
              El responsable del tratamiento de tus datos es el organizador del
              festival cuya identidad figura en la página de contacto.
              Para cualquier consulta sobre protección de datos, puedes
              escribirnos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-[var(--sn-text)]">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>

          {/* ── 2. Datos recopilados ─────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              2. Datos que recopilamos
            </h2>
            <p>Recopilamos los siguientes datos personales:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>
                <strong className="text-[var(--sn-text)]">Email y teléfono:</strong> al
                registrarte en el formulario de leads para recibir promociones del festival.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Nombre:</strong> si lo facilitas
                voluntariamente al enviar un formulario de contacto.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Datos de pago:</strong> procesados
                directamente por Stripe. No almacenamos números de tarjeta, solo el identificador
                de transacción para gestión de entradas.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Datos de navegación:</strong> dirección
                IP (anonimizada mediante hash), tipo de navegador, páginas visitadas
                (mediante cookies analíticas, solo si las aceptas).
              </li>
            </ul>
          </section>

          {/* ── 3. Captura de leads ──────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              3. Captura de leads y comunicaciones
            </h2>
            <p>
              Cuando te registras a través de nuestro formulario de promociones,
              tu email y teléfono se almacenan en nuestra base de datos (PostgreSQL
              alojada en Supabase, región UE) con el único fin de enviarte
              información sobre el festival y promociones limitadas.
            </p>
            <p className="mt-2">
              No vendemos, cedemos ni compartimos estos datos con terceros con fines
              comerciales. Solo los utilizamos para comunicaciones directamente
              relacionadas con el evento.
            </p>
            <p className="mt-2">
              Puedes retirar tu consentimiento en cualquier momento escribiendo
              a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-[var(--sn-text)]">
                {CONTACT_EMAIL}
              </a>{" "}
              con el asunto &quot;Baja de comunicaciones&quot;.
            </p>
          </section>

          {/* ── 4. Finalidad ─────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              4. Finalidad del tratamiento
            </h2>
            <ul className="ml-4 space-y-1 list-disc">
              <li>Enviarte información y promociones del festival (base: consentimiento).</li>
              <li>Gestionar la compra de entradas vía Stripe (base: ejecución contractual).</li>
              <li>Publicar contenido editorial del festival vía Sanity CMS (sin datos personales).</li>
              <li>Analizar el uso de la plataforma para mejorar la experiencia (base: interés legítimo).</li>
            </ul>
          </section>

          {/* ── 5. Base legal ────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              5. Base legal
            </h2>
            <p>
              El tratamiento se basa en tu <strong className="text-[var(--sn-text)]">consentimiento
              explícito</strong> (art. 6.1.a RGPD) al registrarte o aceptar cookies,
              en la <strong className="text-[var(--sn-text)]">ejecución contractual</strong>{" "}
              (art. 6.1.b RGPD) para gestión de compras vía Stripe, y en el{" "}
              <strong className="text-[var(--sn-text)]">interés legítimo</strong> (art. 6.1.f RGPD)
              para el funcionamiento técnico de la plataforma.
            </p>
          </section>

          {/* ── 6. Retención ─────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              6. Plazos de retención
            </h2>
            <ul className="ml-4 space-y-1 list-disc">
              <li>
                <strong className="text-[var(--sn-text)]">Datos de leads (email, teléfono):</strong>{" "}
                conservados hasta 12 meses después de la finalización del festival.
                Tras este periodo se eliminan automáticamente salvo que renueves tu consentimiento.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Datos de compra (Stripe):</strong>{" "}
                conservados durante el periodo legal obligatorio (5 años) por obligaciones fiscales.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Cookie de consentimiento:</strong>{" "}
                180 días desde la última interacción.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Datos de navegación:</strong>{" "}
                26 meses (Google Analytics) o hasta revocación del consentimiento.
              </li>
            </ul>
          </section>

          {/* ── 7. Cookies ───────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              7. Cookies
            </h2>
            <p>Festival Platform utiliza las siguientes cookies:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>
                <strong className="text-[var(--sn-text)]">sn_cookie_consent:</strong> registra tu
                preferencia de cookies (propia, 180 días). Estrictamente necesaria.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Google Analytics:</strong> cookies
                analíticas de terceros para medir el tráfico (solo si aceptas expresamente).
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Facebook Pixel:</strong> cookies de
                marketing de terceros (solo si aceptas expresamente).
              </li>
            </ul>
            <p className="mt-2">
              Puedes gestionar tus preferencias en cualquier momento eliminando
              las cookies de tu navegador o haciendo clic en &quot;Rechazar&quot; en
              el banner de consentimiento.
            </p>
          </section>

          {/* ── 8. Terceros ──────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              8. Terceros y transferencias internacionales
            </h2>
            <ul className="ml-4 space-y-1 list-disc">
              <li>
                <strong className="text-[var(--sn-text)]">Stripe:</strong> procesa pagos con
                tarjeta. Certificado PCI-DSS Nivel 1. Sus servidores pueden estar en
                EE.UU. bajo cláusulas contractuales tipo (art. 46.2.c RGPD).
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Sanity:</strong> CMS para contenido
                editorial del festival (no procesa datos personales de usuarios finales).
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Supabase:</strong> base de datos
                PostgreSQL alojada en la región UE.
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Vercel:</strong> alojamiento de la
                plataforma (servidores en la UE/EE.UU. con cláusulas contractuales tipo).
              </li>
              <li>
                <strong className="text-[var(--sn-text)]">Google/Facebook:</strong> analítica
                y marketing (solo si aceptas cookies).
              </li>
            </ul>
          </section>

          {/* ── 9. Derechos ──────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              9. Tus derechos (RGPD)
            </h2>
            <p>Tienes derecho a:</p>
            <ul className="mt-2 ml-4 space-y-1 list-disc">
              <li>Acceder a tus datos personales.</li>
              <li>Rectificar datos incorrectos.</li>
              <li>Solicitar la supresión de tus datos (&quot;derecho al olvido&quot;).</li>
              <li>Oponerte al tratamiento.</li>
              <li>Solicitar la portabilidad de tus datos en formato estructurado.</li>
              <li>Retirar tu consentimiento en cualquier momento sin efecto retroactivo.</li>
            </ul>
            <p className="mt-2">
              Para ejercer estos derechos, escríbenos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-[var(--sn-text)]">
                {CONTACT_EMAIL}
              </a>.
              Responderemos en un plazo máximo de 30 días.
              También puedes presentar una reclamación ante la Agencia Española
              de Protección de Datos (AEPD) en{" "}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--sn-text)]"
              >
                www.aepd.es
              </a>.
            </p>
          </section>

          {/* ── 10. Contacto ─────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[var(--sn-text)] mb-3">
              10. Contacto
            </h2>
            <p>
              Para cuestiones de privacidad, escríbenos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-[var(--sn-text)]">
                {CONTACT_EMAIL}
              </a>.
            </p>
          </section>
        </div>
      </section>
    </main>
  )
}
