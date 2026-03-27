'use client'

import { useEffect, useCallback } from "react"

const FEATURES = [
  { icon: "🛡️", title: "Tu web blindada", desc: "Protección automática contra hackers, bots y ataques. Más de 70 tipos de amenazas bloqueadas sin que tengas que hacer nada." },
  { icon: "🎫", title: "Vende entradas al instante", desc: "Pasarela de pago integrada con Stripe. Tus clientes compran en 2 clicks. Tú cobras al momento. Facturas automáticas." },
  { icon: "🏢", title: "Multiples marcas, un solo sistema", desc: "Gestiona varios festivales o clientes desde la misma plataforma. Cada uno con su marca, sus datos y su espacio privado." },
  { icon: "🇪🇺", title: "Legal desde el día 1", desc: "Cumple la ley europea de protección de datos (RGPD) automáticamente. Consentimiento de cookies, derecho al olvido, todo incluido." },
  { icon: "⚡", title: "Rápido. Muy rápido.", desc: "Tu web carga en menos de medio segundo. Tus visitantes no esperan. Google te posiciona mejor. Más ventas." },
  { icon: "🧪", title: "Probado y garantizado", desc: "Más de 466 tests automáticos verifican que todo funciona. Cada cambio se prueba antes de publicarse. Cero sorpresas." },
  { icon: "📊", title: "Sabes todo lo que pasa", desc: "Panel de control con métricas en tiempo real. Ventas, visitas, rendimiento del servidor. Todo visible, todo medible." },
  { icon: "🎨", title: "Tu marca, tus colores", desc: "Cambia logo, colores, textos e imágenes sin tocar código. Tu festival, tu identidad. Listo para personalizar." },
]

const STATS = [
  { value: "466+", label: "Tests automáticos", color: "#6C3AFF" },
  { value: "70+", label: "Amenazas bloqueadas", color: "#FF3366" },
  { value: "99.9%", label: "Disponibilidad", color: "#00CC88" },
  { value: "<0.5s", label: "Tiempo de carga", color: "#3A86FF" },
]

const STACK_SIMPLE = [
  { name: "Next.js 15", what: "Motor web" },
  { name: "React 19", what: "Interfaz" },
  { name: "TypeScript", what: "Código seguro" },
  { name: "PostgreSQL", what: "Base de datos" },
  { name: "Stripe", what: "Pagos" },
  { name: "Tailwind 4", what: "Diseño" },
]

export default function LocalePage() {
  // ── Shockwave effect on click ──
  const handleClick = useCallback((e: MouseEvent) => {
    const wave = document.createElement("div")
    wave.style.cssText = `
      position: fixed; left: ${e.clientX}px; top: ${e.clientY}px;
      width: 0; height: 0; border-radius: 50%;
      transform: translate(-50%, -50%);
      background: radial-gradient(circle, rgba(108,58,255,0.3) 0%, rgba(58,134,255,0.1) 40%, transparent 70%);
      pointer-events: none; z-index: 99998;
      animation: shockwave 0.6s ease-out forwards;
    `
    document.body.appendChild(wave)
    setTimeout(() => wave.remove(), 700)
  }, [])

  useEffect(() => {
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [handleClick])

  return (
    <div style={{ minHeight: "100vh", background: "#FFFDF7", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", cursor: "url(/clarity-logo-dark.png) 16 16, auto" }}>
      <style>{`
        @keyframes hero-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes slide-in { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin-logo { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shockwave {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 400px; height: 400px; opacity: 0; }
        }
        .nb-card { transition: transform 0.2s, box-shadow 0.2s; }
        .nb-card:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0px #000; }
        .nb-btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .nb-btn-primary:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px #000; }
        .nb-btn-primary:active { transform: translate(0, 0); box-shadow: 0 0 0 #000; }
        .nb-btn-secondary { transition: all 0.15s; }
        .nb-btn-secondary:hover { background: #000 !important; color: #FFFDF7 !important; transform: translate(-1px, -1px); box-shadow: 4px 4px 0px #000; }
        .spinning-logo { animation: spin-logo 8s linear infinite; }
        .spinning-logo:hover { animation-duration: 2s; }
      `}</style>

      {/* ═══ HERO ═══ */}
      <header style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", textAlign: "center",
        padding: "2rem", borderBottom: "3px solid #000", position: "relative", overflow: "hidden",
      }}>
        {/* Dot pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(#000 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        {/* Gradient blob */}
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "600px", height: "600px", background: "linear-gradient(135deg, #6C3AFF33, #3A86FF22, #FF336622)", backgroundSize: "200% 200%", animation: "hero-gradient 8s ease infinite", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", animation: "slide-in 0.8s ease-out" }}>
          {/* Spinning logo */}
          <div style={{ marginBottom: "2rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/clarity-logo-dark.png" alt="Clarity Structures" width={80} height={80} className="spinning-logo" style={{ display: "inline-block" }} />
          </div>

          {/* Badge */}
          <div style={{ display: "inline-block", padding: "0.5rem 1.25rem", marginBottom: "2rem", background: "#000", color: "#FFFDF7", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em" }}>
            CLARITY STRUCTURES DIGITAL S.L.
          </div>

          <h1 style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)", fontWeight: 900, lineHeight: 0.95, margin: "0 0 1.5rem", color: "#000", letterSpacing: "-0.03em" }}>
            Tu festival,
            <br />
            <span style={{ background: "linear-gradient(135deg, #6C3AFF, #3A86FF, #6C3AFF)", backgroundSize: "200% 200%", animation: "hero-gradient 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              listo para vender
            </span>
          </h1>

          <p style={{ fontSize: "1.25rem", color: "#555", maxWidth: "540px", margin: "0 auto 1rem", lineHeight: 1.7, fontWeight: 500 }}>
            La plataforma completa para gestionar tu festival de música.
            Venta de entradas, seguridad, diseño y cumplimiento legal.
          </p>
          <p style={{ fontSize: "1rem", color: "#999", maxWidth: "480px", margin: "0 auto 2.5rem", lineHeight: 1.6 }}>
            Sin empezar de cero. Sin preocuparte por hackers.
            Solo personaliza y lanza.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#producto" className="nb-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2.5rem", background: "linear-gradient(135deg, #6C3AFF, #3A86FF)", color: "#fff", textDecoration: "none", borderRadius: "14px", fontSize: "1rem", fontWeight: 800, textTransform: "uppercase" as const, border: "2.5px solid #000", boxShadow: "4px 4px 0px #000", letterSpacing: "0.05em" }}>
              Ver producto ↓
            </a>
            <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" className="nb-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", background: "#FFFDF7", color: "#000", textDecoration: "none", borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 700, border: "2.5px solid #000", boxShadow: "3px 3px 0px #000" }}>
              ⭐ GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", animation: "float 2s ease-in-out infinite" }}>
          <div style={{ width: "28px", height: "44px", border: "2.5px solid #000", borderRadius: "14px", display: "flex", justifyContent: "center", paddingTop: "8px" }}>
            <div style={{ width: "4px", height: "10px", background: "#000", borderRadius: "2px" }} />
          </div>
        </div>
      </header>

      {/* ═══ STATS ═══ */}
      <section style={{ borderBottom: "3px solid #000", padding: "3rem 2rem", background: "#000" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.5rem", textAlign: "center" }}>
          {STATS.map((stat) => (
            <div key={stat.label} style={{ padding: "1.5rem 1rem", background: "#111", border: "2px solid #333", borderRadius: "16px" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: stat.color, letterSpacing: "-0.02em" }}>{stat.value}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: "0.25rem" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRODUCTO ═══ */}
      <section id="producto" style={{ padding: "6rem 2rem", borderBottom: "3px solid #000" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", marginBottom: "1rem", background: "#E8FF3A", border: "2px solid #000", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em" }}>
            PRODUCTO
          </span>

          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, color: "#000", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Festival Platform Template
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#555", margin: "0 0 1rem", maxWidth: "600px", lineHeight: 1.7 }}>
            Todo lo que necesitas para lanzar la web de tu festival.
            Venta de entradas, gestión de artistas, protección contra ataques,
            cumplimiento legal europeo y panel de administración.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "#888", margin: "0 0 2.5rem", maxWidth: "560px", lineHeight: 1.6 }}>
            No es un template genérico. Es infraestructura de producción
            probada con más de 466 tests automáticos. Personaliza los colores,
            añade tu logo y empieza a vender.
          </p>

          {/* Stack pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginBottom: "2.5rem" }}>
            {STACK_SIMPLE.map((tech) => (
              <span key={tech.name} style={{ padding: "0.5rem 1rem", background: "#F0ECFF", color: "#6C3AFF", border: "2px solid #6C3AFF", borderRadius: "10px", fontSize: "0.8125rem", fontWeight: 700 }}>
                {tech.name} <span style={{ color: "#999", fontWeight: 500 }}>· {tech.what}</span>
              </span>
            ))}
          </div>

          {/* Status badges */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <span style={{ padding: "0.5rem 1.25rem", background: "#00CC88", color: "#000", border: "2.5px solid #000", borderRadius: "12px", boxShadow: "3px 3px 0px #000", fontSize: "0.875rem", fontWeight: 800 }}>
              ✓ Listo para producción
            </span>
            <span style={{ padding: "0.5rem 1.25rem", background: "#FFFDF7", color: "#000", border: "2.5px solid #000", borderRadius: "12px", boxShadow: "3px 3px 0px #000", fontSize: "0.875rem", fontWeight: 700 }}>
              v1.13
            </span>
          </div>

          {/* CTA */}
          <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" className="nb-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", padding: "1.125rem 2.5rem", background: "linear-gradient(135deg, #6C3AFF, #3A86FF)", color: "#fff", textDecoration: "none", borderRadius: "14px", fontSize: "1rem", fontWeight: 800, textTransform: "uppercase" as const, border: "2.5px solid #000", boxShadow: "4px 4px 0px #000" }}>
            Obtener el código →
          </a>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "6rem 2rem", borderBottom: "3px solid #000" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", marginBottom: "1rem", background: "#FF3366", color: "#fff", border: "2px solid #000", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em" }}>
            QUÉ INCLUYE
          </span>

          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "#000", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Todo resuelto.
            <br />
            Sin sorpresas.
          </h2>
          <p style={{ fontSize: "1rem", color: "#888", margin: "0 0 3rem", maxWidth: "500px" }}>
            Cada funcionalidad está construida, probada y documentada. No vas a necesitar reinventar nada.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {FEATURES.map((feature) => (
              <div key={feature.title} className="nb-card" style={{ padding: "1.75rem", background: "#fff", border: "2.5px solid #000", borderRadius: "16px", boxShadow: "5px 5px 0px #000", cursor: "default" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#000", margin: "0 0 0.5rem" }}>{feature.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "#666", margin: 0, lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PARA QUIÉN ═══ */}
      <section style={{ padding: "5rem 2rem", borderBottom: "3px solid #000", background: "#F5F0FF" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", textAlign: "center" }}>
          <span style={{ display: "inline-block", padding: "0.375rem 1rem", marginBottom: "1rem", background: "#6C3AFF", color: "#fff", border: "2px solid #000", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em" }}>
            PARA QUIÉN
          </span>

          <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "#000", margin: "0 0 2.5rem", letterSpacing: "-0.02em" }}>
            Pensado para ti
          </h2>

          <div style={{ display: "grid", gap: "1rem", textAlign: "left" }}>
            {[
              { who: "Promotores de festivales", what: "Lanza tu web profesional en días, no meses. Con venta de entradas y legal cubierto." },
              { who: "Agencias y estudios", what: "Usa esto como base para tus clientes de eventos. Ahorra cientos de horas de desarrollo." },
              { who: "Desarrolladores freelance", what: "Código limpio, bien testeado, bien documentado. Fork y personaliza para cada proyecto." },
              { who: "Startups de ticketing", what: "Infraestructura enterprise-grade desde el día 1. Escala sin reescribir." },
            ].map((item) => (
              <div key={item.who} style={{ padding: "1.25rem 1.5rem", background: "#fff", border: "2.5px solid #000", borderRadius: "14px", boxShadow: "4px 4px 0px #000" }}>
                <strong style={{ fontSize: "1rem", color: "#000" }}>{item.who}</strong>
                <p style={{ fontSize: "0.875rem", color: "#666", margin: "0.375rem 0 0", lineHeight: 1.5 }}>{item.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{ padding: "6rem 2rem", borderBottom: "3px solid #000", background: "#000", color: "#FFFDF7" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            ¿Empezamos? 🚀
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#999", margin: "0 0 2.5rem", lineHeight: 1.7 }}>
            Licencias enterprise, integraciones a medida o consultoría técnica. Escríbenos.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:admin@claritystructures.com" className="nb-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", background: "linear-gradient(135deg, #6C3AFF, #3A86FF)", color: "#fff", textDecoration: "none", borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 800, border: "2.5px solid #FFFDF7", boxShadow: "4px 4px 0px #FFFDF7" }}>
              ✉ Contactar
            </a>
            <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", background: "transparent", color: "#FFFDF7", textDecoration: "none", borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 700, border: "2.5px solid #333", transition: "border-color 0.2s" }}>
              Ver código ↗
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "2.5rem 2rem", textAlign: "center", background: "#FFFDF7" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/clarity-logo-dark.png" alt="" width={32} height={32} className="spinning-logo" style={{ display: "inline-block", opacity: 0.3 }} />
        </div>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#000" }}>
          Clarity Structures Digital S.L.
        </div>
        <div style={{ fontSize: "0.75rem", color: "#999" }}>
          © 2026 · Madrid, España · Todos los derechos reservados
        </div>
      </footer>
    </div>
  )
}
