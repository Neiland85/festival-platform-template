"use client"

import { useState } from "react"
const CONTACT_EMAIL = process.env["NEXT_PUBLIC_CONTACT_EMAIL"] ?? "admin@claritystructures.com"

const EVENT_TYPES = [
  { value: "festival", label: "Festival de música" },
  { value: "conference", label: "Conferencia" },
  { value: "corporate", label: "Evento corporativo" },
  { value: "other", label: "Otro" },
] as const

const SIZE_OPTIONS = [
  { value: "small", label: "< 500", num: 250 },
  { value: "medium", label: "500 – 2.000", num: 1000 },
  { value: "large", label: "2.000 – 10.000", num: 5000 },
  { value: "xlarge", label: "10.000+", num: 15000 },
] as const

const STAGE_OPTIONS = [
  { value: "idea", label: "Todavía es una idea" },
  { value: "planning", label: "Planificando" },
  { value: "selling", label: "Ya vendiendo entradas" },
] as const

const GOAL_OPTIONS = [
  { value: "tickets", label: "Vender más entradas" },
  { value: "marketing", label: "Automatizar marketing" },
  { value: "audience", label: "Entender mi audiencia" },
] as const

/* ── Scoring logic ── */

function computeScore(size: string, stage: string, goal: string): number {
  let score = 50
  const sizeNum = SIZE_OPTIONS.find((s) => s.value === size)?.num ?? 0
  if (sizeNum >= 2000) score += 30
  if (goal === "tickets") score += 20
  if (stage === "selling") score += 10
  return Math.min(score, 100)
}

function getLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Alto", color: "#00CC88" }
  if (score >= 60) return { label: "Medio", color: "#3A86FF" }
  return { label: "Bajo", color: "#888" }
}

function getAction(score: number): string {
  if (score >= 80) return "Campaña premium"
  if (score >= 60) return "Email nurturing"
  return "Retargeting"
}

function getSpudMessage(size: string, stage: string): string | null {
  const sizeNum = SIZE_OPTIONS.find((s) => s.value === size)?.num ?? 0
  if (sizeNum >= 2000) return "Tu caso es ideal para SPUD — máximo impacto con automatización."
  if (stage === "idea") return "Te ayudamos desde cero — de la idea al primer ticket vendido."
  return null
}

function getCtaText(size: string, stage: string): string {
  const sizeNum = SIZE_OPTIONS.find((s) => s.value === size)?.num ?? 0
  if (sizeNum >= 2000) return "Ver cómo SPUD puede aumentar tus ventas →"
  if (stage === "idea") return "Quiero lanzar mi evento con SPUD →"
  return "Solicitar demo personalizada →"
}

export function ContactForm() {
  const [eventType, setEventType] = useState("")
  const [size, setSize] = useState("")
  const [stage, setStage] = useState("")
  const [goal, setGoal] = useState("")

  const spudMessage = getSpudMessage(size, stage)
  const ctaText = getCtaText(size, stage)
  const score = computeScore(size, stage, goal)
  const level = getLevel(score)
  const action = getAction(score)
  const hasSelections = size !== "" || stage !== "" || goal !== ""

  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFFDF7",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "4rem 2rem" }}>

        {/* ── Header ── */}
        <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 3rem" }}>
          <a href="/es" style={{
            display: "inline-block", marginBottom: "1.5rem",
            fontSize: "0.75rem", fontWeight: 700, color: "#6C3AFF",
            textDecoration: "none", letterSpacing: "0.05em",
          }}>
            ← Volver al inicio
          </a>

          <h1 style={{
            fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900,
            color: "#000", margin: "0 0 0.75rem", letterSpacing: "-0.02em",
          }}>
            Cuéntanos tu evento
          </h1>
          <p style={{ fontSize: "1.125rem", color: "#888", margin: 0, lineHeight: 1.6 }}>
            Te enseñamos cómo aumentar ventas en menos de 30 minutos
          </p>
        </div>

        {/* ── 2-col layout: form + SPUD panel ── */}
        <div className="contact-grid-2col" style={{
          display: "grid", gap: "2rem", alignItems: "start",
        }}>

          {/* ── Left: Form card ── */}
          <div style={{
            background: "#fff", border: "2.5px solid #000", borderRadius: "20px",
            boxShadow: "6px 6px 0px #000", padding: "2.5rem",
          }}>
            <form
              action={`mailto:${CONTACT_EMAIL}`}
              method="POST"
              encType="text/plain"
              onSubmit={() => {
                // Fire-and-forget tracking — does not block form submission
                fetch("/api/track", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event: "lead_created",
                    data: { eventType, size, stage, goal, score },
                  }),
                }).catch(() => {})
              }}
            >
              {/* Section 1: Basics */}
              <div style={{ marginBottom: "2rem" }}>
                <SectionLabel number="1" text="Datos de contacto" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <FormInput name="name" placeholder="Tu nombre" required />
                  <FormInput name="email" placeholder="Email de trabajo" type="email" required />
                </div>
              </div>

              {/* Section 2: Event type */}
              <div style={{ marginBottom: "2rem" }}>
                <SectionLabel number="2" text="Tipo de evento" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                  {EVENT_TYPES.map((opt) => (
                    <OptionChip
                      key={opt.value}
                      label={opt.label}
                      selected={eventType === opt.value}
                      onClick={() => setEventType(opt.value)}
                      name="event_type"
                      value={opt.value}
                    />
                  ))}
                </div>
              </div>

              {/* Section 3: Size */}
              <div style={{ marginBottom: "2rem" }}>
                <SectionLabel number="3" text="Tamaño esperado" />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                  {SIZE_OPTIONS.map((opt) => (
                    <OptionChip
                      key={opt.value}
                      label={opt.label}
                      selected={size === opt.value}
                      onClick={() => setSize(opt.value)}
                      name="size"
                      value={opt.value}
                    />
                  ))}
                </div>
              </div>

              {/* Section 4: Stage */}
              <div style={{ marginBottom: "2rem" }}>
                <SectionLabel number="4" text="¿En qué fase estás?" />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {STAGE_OPTIONS.map((opt) => (
                    <OptionChip
                      key={opt.value}
                      label={opt.label}
                      selected={stage === opt.value}
                      onClick={() => setStage(opt.value)}
                      name="stage"
                      value={opt.value}
                    />
                  ))}
                </div>
              </div>

              {/* Section 5: Goal */}
              <div style={{ marginBottom: "2rem" }}>
                <SectionLabel number="5" text="Objetivo principal" />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {GOAL_OPTIONS.map((opt) => (
                    <OptionChip
                      key={opt.value}
                      label={opt.label}
                      selected={goal === opt.value}
                      onClick={() => setGoal(opt.value)}
                      name="goal"
                      value={opt.value}
                    />
                  ))}
                </div>
              </div>

              {/* SPUD insight message */}
              {spudMessage && (
                <div style={{
                  padding: "1rem 1.25rem",
                  background: "#F0ECFF",
                  border: "2px solid #6C3AFF",
                  borderRadius: "12px",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}>
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>🧠</span>
                  <div>
                    <div style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#6C3AFF", letterSpacing: "0.05em", marginBottom: "2px" }}>
                      SPUD INSIGHT
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#333", lineHeight: 1.5 }}>
                      {spudMessage}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "1.125rem",
                  background: "linear-gradient(135deg, #6C3AFF, #3A86FF)",
                  color: "#fff",
                  border: "2.5px solid #000",
                  borderRadius: "14px",
                  fontSize: "1rem",
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase" as const,
                  cursor: "pointer",
                  boxShadow: "4px 4px 0px #000",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translate(-2px, -2px)"
                  e.currentTarget.style.boxShadow = "6px 6px 0px #000"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translate(0, 0)"
                  e.currentTarget.style.boxShadow = "4px 4px 0px #000"
                }}
              >
                {ctaText}
              </button>

              <p style={{
                fontSize: "0.75rem", color: "#999", textAlign: "center",
                marginTop: "0.75rem",
              }}>
                Respuesta en menos de 24h
              </p>
            </form>
          </div>

          {/* ── Right: SPUD LIVE panel ── */}
          <div style={{ position: "sticky", top: "2rem" }}>
            <div style={{
              background: "#111", border: "2.5px solid #000", borderRadius: "16px",
              boxShadow: "5px 5px 0px #000", padding: "1.5rem", overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: hasSelections ? "#00CC88" : "#555",
                  boxShadow: hasSelections ? "0 0 8px #00CC8866" : "none",
                  transition: "background 0.3s, box-shadow 0.3s",
                }} />
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#888", letterSpacing: "0.08em" }}>
                  SPUD LIVE
                </span>
              </div>

              {/* Score display */}
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <div className="spud-live-score" style={{
                  fontSize: "3.5rem", fontWeight: 900, color: level.color,
                  lineHeight: 1, letterSpacing: "-0.03em",
                }}>
                  {score}
                </div>
                <div style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#666", marginTop: "0.25rem", letterSpacing: "0.05em" }}>
                  LEAD SCORE
                </div>
              </div>

              {/* Score bar */}
              <div style={{
                width: "100%", height: "6px", background: "#2a2a2a",
                borderRadius: "3px", overflow: "hidden", marginBottom: "1.5rem",
              }}>
                <div className="spud-live-bar-track" style={{
                  height: "100%", width: `${score}%`,
                  background: level.color, borderRadius: "3px",
                }} />
              </div>

              {/* Metrics rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Priority */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.75rem 1rem", background: "#1a1a1a",
                  border: "1.5px solid #2a2a2a", borderRadius: "10px",
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600 }}>Prioridad</span>
                  <span className="spud-live-badge" style={{
                    padding: "0.25rem 0.625rem",
                    background: `${level.color}22`,
                    color: level.color,
                    border: `1.5px solid ${level.color}44`,
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                  }}>
                    {level.label}
                  </span>
                </div>

                {/* Action */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "0.75rem 1rem", background: "#1a1a1a",
                  border: "1.5px solid #2a2a2a", borderRadius: "10px",
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600 }}>Acción</span>
                  <span className="spud-live-badge" style={{
                    padding: "0.25rem 0.625rem",
                    background: "#6C3AFF22",
                    color: "#6C3AFF",
                    border: "1.5px solid #6C3AFF44",
                    borderRadius: "6px",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                  }}>
                    {action}
                  </span>
                </div>

                {/* Factors */}
                <div style={{
                  padding: "0.75rem 1rem", background: "#1a1a1a",
                  border: "1.5px solid #2a2a2a", borderRadius: "10px",
                }}>
                  <span style={{ fontSize: "0.75rem", color: "#888", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>Factores</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                    <FactorPill label="Tamaño" active={size !== ""} />
                    <FactorPill label="Objetivo" active={goal !== ""} />
                    <FactorPill label="Fase" active={stage !== ""} />
                    <FactorPill label="Tipo" active={eventType !== ""} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #2a2a2a",
                textAlign: "center",
              }}>
                <span style={{ fontSize: "0.625rem", color: "#555" }}>
                  Selecciona opciones para ver tu análisis
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function FactorPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span style={{
      padding: "0.2rem 0.5rem",
      background: active ? "#00CC8822" : "#2a2a2a",
      color: active ? "#00CC88" : "#555",
      border: `1px solid ${active ? "#00CC8844" : "#333"}`,
      borderRadius: "6px",
      fontSize: "0.625rem",
      fontWeight: 600,
      transition: "all 0.3s ease",
    }}>
      {label}
    </span>
  )
}

function SectionLabel({ number, text }: { number: string; text: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.5rem",
      marginBottom: "0.75rem",
    }}>
      <span style={{
        width: "22px", height: "22px", borderRadius: "50%",
        background: "#000", color: "#FFFDF7",
        fontSize: "0.6875rem", fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {number}
      </span>
      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#000" }}>
        {text}
      </span>
    </div>
  )
}

function OptionChip({
  label,
  selected,
  onClick,
  name,
  value,
}: {
  label: string
  selected: boolean
  onClick: () => void
  name: string
  value: string
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.75rem 1rem",
        background: selected ? "#F0ECFF" : "#FAFAFA",
        border: selected ? "2.5px solid #6C3AFF" : "2px solid #E5E5E5",
        borderRadius: "12px",
        fontSize: "0.8125rem",
        fontWeight: selected ? 700 : 500,
        color: selected ? "#6C3AFF" : "#555",
        cursor: "pointer",
        transition: "all 0.15s",
        textAlign: "center" as const,
        userSelect: "none" as const,
      }}
      onClick={onClick}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        onChange={onClick}
        style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
      />
      {label}
    </label>
  )
}

function FormInput({
  name,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} style={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {placeholder}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        style={{
          width: "100%",
          padding: "0.875rem 1rem",
          background: "#FAFAFA",
          border: "2px solid #E5E5E5",
          borderRadius: "12px",
          fontSize: "0.875rem",
          color: "#000",
          outline: "none",
          transition: "border-color 0.2s",
          boxSizing: "border-box" as const,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#6C3AFF" }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5E5" }}
      />
    </div>
  )
}
