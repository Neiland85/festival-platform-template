'use client'

import { useEffect, useCallback } from "react"
import { SpudMiniDemo } from "@/ui/components/demo/SpudMiniDemo"

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

const HERO_METRICS = [
  { value: "+23%", label: "Conversión media", color: "#00CC88" },
  { value: "-40%", label: "Tiempo manual", color: "#3A86FF" },
  { value: "3x", label: "ROI en campañas", color: "#6C3AFF" },
]

const HERO_PREVIEW = [
  { name: "Marta", role: "Founder", score: 91, action: "Oferta premium", color: "#00CC88" },
  { name: "Ana", role: "Marketer", score: 82, action: "Email nurturing", color: "#3A86FF" },
  { name: "Luis", role: "Developer", score: 67, action: "Retargeting", color: "#888" },
]

const DEMO_STEPS = [
  {
    step: "01",
    icon: "🎯",
    title: "Captas leads",
    desc: "Formularios integrados capturan visitantes interesados. Cada lead se almacena con contexto: origen, intención y datos de contacto.",
    color: "#6C3AFF",
  },
  {
    step: "02",
    icon: "🧠",
    title: "SPUD decide",
    desc: "El motor de scoring analiza cada lead automáticamente. Segmenta por valor, prioriza los más calientes y descarta bots.",
    color: "#3A86FF",
  },
  {
    step: "03",
    icon: "🚀",
    title: "Ejecutas campañas",
    desc: "Emails personalizados generados con IA. Cada segmento recibe el mensaje correcto, en el momento correcto. Tú solo apruebas.",
    color: "#00CC88",
  },
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
      {/* ═══ HERO ═══ */}
      <header style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "6rem 2rem 3rem", borderBottom: "3px solid #000",
        position: "relative", overflow: "hidden",
      }}>
        {/* Dot pattern */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(#000 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }} />
        {/* Gradient blob */}
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "600px", height: "600px", background: "linear-gradient(135deg, #6C3AFF33, #3A86FF22, #FF336622)", backgroundSize: "200% 200%", animation: "hero-gradient 8s ease infinite", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

        <div className="hero-grid-2col" style={{ position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto", width: "100%", display: "grid", gap: "2rem", alignItems: "center" }}>

          {/* ── Left column: Copy ── */}
          <div style={{ animation: "slide-in 0.8s ease-out" }}>
            {/* Badge */}
            <div style={{ display: "inline-block", padding: "0.5rem 1.25rem", marginBottom: "1.5rem", background: "#000", color: "#FFFDF7", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em" }}>
              PLATAFORMA DE CONVERSIÓN PARA EVENTOS
            </div>

            <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.05, margin: "0 0 1.25rem", color: "#000", letterSpacing: "-0.03em" }}>
              Convierte visitantes en compradores{" "}
              <span style={{ background: "linear-gradient(135deg, #6C3AFF, #3A86FF, #6C3AFF)", backgroundSize: "200% 200%", animation: "hero-gradient 4s ease infinite", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                automáticamente
              </span>
            </h1>

            <p style={{ fontSize: "1.125rem", color: "#555", maxWidth: "540px", margin: "0 0 0.75rem", lineHeight: 1.7, fontWeight: 500 }}>
              Captura leads, cualifícalos con inteligencia artificial y ejecuta campañas que convierten — sin intervención manual.
            </p>
            <p style={{ fontSize: "0.875rem", color: "#999", maxWidth: "480px", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
              Para festivales, eventos y experiencias que quieren escalar ventas sin aumentar equipo.
            </p>

            {/* Metrics */}
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
              {HERO_METRICS.map((m) => (
                <div key={m.label} style={{ display: "flex", alignItems: "baseline", gap: "0.375rem" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 900, color: m.color, letterSpacing: "-0.02em" }}>{m.value}</span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", letterSpacing: "0.02em" }}>{m.label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="#demo" className="nb-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2.5rem", background: "linear-gradient(135deg, #6C3AFF, #3A86FF)", color: "#fff", textDecoration: "none", borderRadius: "14px", fontSize: "1rem", fontWeight: 800, textTransform: "uppercase" as const, border: "2.5px solid #000", boxShadow: "4px 4px 0px #000", letterSpacing: "0.05em", animation: "pulse-border 2s ease-in-out infinite" }}>
                Ver demo en acción →
              </a>
              <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" className="nb-btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", background: "#FFFDF7", color: "#000", textDecoration: "none", borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 700, border: "2.5px solid #000", boxShadow: "3px 3px 0px #000" }}>
                ⭐ GitHub
              </a>
            </div>
          </div>

          {/* ── Right column: Brand video + Mini preview card ── */}
          <div style={{ animation: "slide-in-right 0.8s ease-out 0.2s both", maxWidth: "420px", justifySelf: "center", width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Brand video card */}
            <div style={{
              background: "#fff", border: "1.5px solid #e5e5e5", borderRadius: "14px",
              padding: "1rem", display: "flex", alignItems: "center", gap: "0.875rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "12px", overflow: "hidden",
                flexShrink: 0, background: "#f5f5f5",
              }}>
                <video
                  src="/clarity_logo2.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </div>
              <div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 800, color: "#000", letterSpacing: "-0.01em" }}>Clarity Engine</div>
                <div style={{ fontSize: "0.6875rem", color: "#888", marginTop: "2px" }}>Automatización inteligente para eventos</div>
              </div>
            </div>

            {/* SPUD preview card */}
            <div style={{
              background: "#111", border: "2.5px solid #000", borderRadius: "16px",
              boxShadow: "6px 6px 0px #000", padding: "1.5rem", overflow: "hidden",
            }}>
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00CC88", boxShadow: "0 0 6px #00CC8866" }} />
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#888", letterSpacing: "0.08em" }}>SPUD ENGINE — LIVE</span>
              </div>

              {/* Lead rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {HERO_PREVIEW.map((lead) => (
                  <div key={lead.name} className="hero-preview-row" style={{
                    display: "flex", alignItems: "center", gap: "0.625rem",
                    padding: "0.75rem 1rem", background: "#1a1a1a",
                    border: `1.5px solid ${lead.score >= 85 ? "#00CC8844" : "#2a2a2a"}`,
                    borderRadius: "10px",
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: `${lead.color}22`, border: `1.5px solid ${lead.color}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8125rem", fontWeight: 700, color: "#fff", flexShrink: 0,
                    }}>
                      {lead.name[0]}
                    </div>

                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff" }}>{lead.name}</div>
                      <div style={{ fontSize: "0.625rem", color: "#666" }}>{lead.role}</div>
                    </div>

                    {/* Score */}
                    <span style={{
                      fontSize: "0.8125rem", fontWeight: 800, color: lead.color,
                      minWidth: "24px", textAlign: "right" as const,
                    }}>
                      {lead.score}
                    </span>

                    {/* Action */}
                    <span style={{
                      padding: "0.2rem 0.5rem",
                      background: `${lead.color}18`,
                      color: lead.color,
                      borderRadius: "6px",
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      border: `1px solid ${lead.color}33`,
                      whiteSpace: "nowrap" as const,
                      flexShrink: 0,
                    }}>
                      {lead.action}
                    </span>
                  </div>
                ))}
              </div>

              {/* Card footer */}
              <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.625rem", color: "#666" }}>3 leads procesados</span>
                <span style={{ fontSize: "0.625rem", color: "#00CC88", fontWeight: 700 }}>Decisiones automáticas ✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)", animation: "float 2s ease-in-out infinite" }}>
          <div style={{ width: "28px", height: "44px", border: "2.5px solid #000", borderRadius: "14px", display: "flex", justifyContent: "center", paddingTop: "8px" }}>
            <div style={{ width: "4px", height: "10px", background: "#000", borderRadius: "2px" }} />
          </div>
        </div>
      </header>

      {/* ═══ DEMO — Cómo funciona ═══ */}
      <section id="demo" style={{ padding: "6rem 2rem", borderBottom: "3px solid #000", background: "#FAFAFE" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span style={{ display: "inline-block", padding: "0.375rem 1rem", marginBottom: "1rem", background: "#3A86FF", color: "#fff", border: "2px solid #000", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em" }}>
              CÓMO FUNCIONA
            </span>
            <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "#000", margin: "0 0 0.75rem", letterSpacing: "-0.02em" }}>
              De visitante a comprador
              <br />
              <span style={{ color: "#6C3AFF" }}>en 3 pasos</span>
            </h2>
            <p style={{ fontSize: "1rem", color: "#888", maxWidth: "480px", margin: "0 auto" }}>
              Sin intervención manual. El sistema captura, cualifica y convierte por ti.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            {DEMO_STEPS.map((step) => (
              <div key={step.step} className="demo-card" style={{ padding: "2rem", background: "#fff", border: "2.5px solid #000", borderRadius: "16px", boxShadow: "5px 5px 0px #000", position: "relative" }}>
                <div style={{ position: "absolute", top: "1rem", right: "1.25rem", fontSize: "3rem", fontWeight: 900, color: step.color, opacity: 0.12, lineHeight: 1 }}>
                  {step.step}
                </div>
                <div style={{ fontSize: "2.25rem", marginBottom: "1rem" }}>{step.icon}</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#000", margin: "0 0 0.625rem" }}>{step.title}</h3>
                <p style={{ fontSize: "0.875rem", color: "#666", margin: 0, lineHeight: 1.65 }}>{step.desc}</p>
                <div style={{ marginTop: "1.25rem", width: "40px", height: "4px", borderRadius: "2px", background: step.color }} />
              </div>
            ))}
          </div>

          {/* Interactive SPUD demo */}
          <SpudMiniDemo />

          {/* CTA after demo */}
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <p style={{ fontSize: "0.9375rem", color: "#888", marginBottom: "1rem", fontWeight: 600 }}>
              Esto ocurre automáticamente con SPUD
            </p>
            <a href="/es/contacto" className="nb-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.875rem 2rem", background: "linear-gradient(135deg, #6C3AFF, #3A86FF)", color: "#fff", textDecoration: "none", borderRadius: "14px", fontSize: "0.875rem", fontWeight: 800, border: "2.5px solid #000", boxShadow: "4px 4px 0px #000" }}>
              Solicitar demo personalizada →
            </a>
          </div>

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <a href="#producto" style={{ fontSize: "0.9375rem", color: "#6C3AFF", fontWeight: 700, textDecoration: "none", borderBottom: "2px solid #6C3AFF", paddingBottom: "2px" }}>
              Ver todas las funcionalidades ↓
            </a>
          </div>
        </div>
      </section>

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

      {/* ═══ CONVERSIÓN — CTA final ═══ */}
      <section style={{ padding: "6rem 2rem", borderBottom: "3px solid #000", background: "#000", color: "#FFFDF7" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            ¿Quieres implementar esto en tu festival?
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#999", margin: "0 0 1rem", lineHeight: 1.7 }}>
            Automatiza la captación de leads, cualifica con IA y lanza campañas que convierten.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "#666", margin: "0 0 2.5rem", lineHeight: 1.6 }}>
            Te ayudamos con la implementación, personalización y puesta en marcha. Respuesta en menos de 24h.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/es/contacto" className="nb-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", background: "linear-gradient(135deg, #6C3AFF, #3A86FF)", color: "#fff", textDecoration: "none", borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 800, border: "2.5px solid #FFFDF7", boxShadow: "4px 4px 0px #FFFDF7" }}>
              Solicitar demo personalizada →
            </a>
            <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "1rem 2rem", background: "transparent", color: "#FFFDF7", textDecoration: "none", borderRadius: "14px", fontSize: "0.9375rem", fontWeight: 700, border: "2.5px solid #333", transition: "border-color 0.2s" }}>
              Ver código ↗
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "2.5rem 2rem", textAlign: "center", background: "#FFFDF7" }}>
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
