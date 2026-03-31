"use client"

import { useState, useEffect } from "react"

const MOCK_LEADS = [
  { name: "Marta", role: "Founder", source: "Referral", score: 91, action: "Enviar oferta premium" },
  { name: "Ana", role: "Marketer", source: "Paid Ads", score: 82, action: "Email nurturing" },
  { name: "Luis", role: "Developer", source: "Organic", score: 67, action: "Retargeting ads" },
] as const

function scoreColor(score: number): string {
  if (score >= 85) return "#00CC88"
  if (score >= 70) return "#3A86FF"
  return "#888"
}

export function SpudMiniDemo() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 1500)
    const t2 = setTimeout(() => setStep(2), 3000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div style={{
      marginTop: "2.5rem",
      background: "#111",
      border: "2.5px solid #000",
      borderRadius: "16px",
      boxShadow: "5px 5px 0px #000",
      padding: "2rem",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: step === 0 ? "#FF3366" : step === 1 ? "#E8FF3A" : "#00CC88",
            boxShadow: `0 0 8px ${step === 0 ? "#FF336666" : step === 1 ? "#E8FF3A66" : "#00CC8866"}`,
            transition: "background 0.3s, box-shadow 0.3s",
          }} />
          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#fff", letterSpacing: "0.05em" }}>
            SPUD Engine
          </span>
        </div>
        <span style={{
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: step === 1 ? "#E8FF3A" : "#666",
          letterSpacing: "0.05em",
          transition: "color 0.3s",
        }}>
          {step === 0 && "Leads recibidos"}
          {step === 1 && "Scoring en curso..."}
          {step === 2 && "Decisiones listas"}
        </span>
      </div>

      {/* Lead rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {MOCK_LEADS.map((lead) => {
          const isTop = step === 2 && lead.score >= 85
          return (
            <div
              key={lead.name}
              className="spud-lead-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 1.25rem",
                background: isTop ? "#1a2a1a" : "#1a1a1a",
                border: isTop ? "2px solid #00CC88" : "2px solid #2a2a2a",
                borderRadius: "12px",
                flexWrap: "wrap",
              }}
            >
              {/* Avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", minWidth: "120px", flex: "1 1 120px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${scoreColor(lead.score)}44, ${scoreColor(lead.score)}22)`,
                  border: `2px solid ${scoreColor(lead.score)}44`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color: "#fff",
                  flexShrink: 0,
                }}>
                  {lead.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "#fff" }}>{lead.name}</div>
                  <div style={{ fontSize: "0.6875rem", color: "#888" }}>{lead.role}</div>
                </div>
              </div>

              {/* Source badge */}
              <span style={{
                padding: "0.25rem 0.625rem",
                background: "#2a2a2a",
                color: "#aaa",
                borderRadius: "6px",
                fontSize: "0.6875rem",
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {lead.source}
              </span>

              {/* Step 0: "nuevo" badge */}
              {step === 0 && (
                <span style={{
                  padding: "0.25rem 0.5rem",
                  background: "#FF336622",
                  color: "#FF3366",
                  borderRadius: "6px",
                  fontSize: "0.625rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                  flexShrink: 0,
                }}>
                  nuevo
                </span>
              )}

              {/* Step 1: Score with bar */}
              {step >= 1 && (
                <div className={step === 1 ? "spud-fade-in" : undefined} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto", flexShrink: 0 }}>
                  <div style={{
                    width: "60px",
                    height: "6px",
                    background: "#2a2a2a",
                    borderRadius: "3px",
                    overflow: "hidden",
                  }}>
                    <div
                      className="spud-score-bar"
                      style={{
                        height: "100%",
                        width: `${lead.score}%`,
                        background: scoreColor(lead.score),
                        borderRadius: "3px",
                        animation: step === 1 ? "spud-bar-fill 0.6s ease" : undefined,
                      }}
                    />
                  </div>
                  <span style={{
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: scoreColor(lead.score),
                    minWidth: "28px",
                    textAlign: "right" as const,
                  }}>
                    {lead.score}
                  </span>
                </div>
              )}

              {/* Step 2: Action tag */}
              {step === 2 && (
                <span className="spud-fade-in" style={{
                  padding: "0.3rem 0.75rem",
                  background: `${scoreColor(lead.score)}22`,
                  color: scoreColor(lead.score),
                  borderRadius: "8px",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  border: `1.5px solid ${scoreColor(lead.score)}44`,
                  flexShrink: 0,
                  whiteSpace: "nowrap" as const,
                }}>
                  {lead.action}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress steps indicator */}
      <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
        {[0, 1, 2].map((s) => (
          <div key={s} style={{
            width: step >= s ? "24px" : "8px",
            height: "4px",
            borderRadius: "2px",
            background: step >= s ? "#6C3AFF" : "#333",
            transition: "width 0.3s, background 0.3s",
          }} />
        ))}
      </div>
    </div>
  )
}
