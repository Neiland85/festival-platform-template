"use client"

import { useState, useCallback, useEffect } from "react"

const COOKIE_KEY = "sn_cookie_consent"

function hasConsent(): boolean {
  if (typeof document === "undefined") return true
  const v = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_KEY}=`))
    ?.split("=")[1]
  return v === "accepted" || v === "rejected"
}

function setConsent(value: "accepted" | "rejected") {
  const maxAge = 180 * 24 * 60 * 60
  const secure = globalThis.location?.protocol === "https:" ? "; Secure" : ""
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`
}

export function ShowcaseCookieBanner() {
  const [dismissed, setDismissed] = useState(hasConsent)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [dismissed])

  const handleAccept = useCallback(() => { setConsent("accepted"); setDismissed(true) }, [])
  const handleReject = useCallback(() => { setConsent("rejected"); setDismissed(true) }, [])

  if (dismissed) return null

  return (
    <>
      <style>{`
        @keyframes cookie-slide-up {
          from { transform: translateY(120%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes cookie-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sc-accept:hover { transform: translate(-2px,-2px); box-shadow: 4px 4px 0px #000 !important; }
        .sc-accept:active { transform: translate(0,0); box-shadow: 0 0 0 #000 !important; }
        .sc-reject:hover { background: #1a1a1a !important; color: #fff !important; transform: translate(-1px,-1px); box-shadow: 3px 3px 0 #000 !important; }
        .sc-reject:active { transform: translate(0,0); box-shadow: 0 0 0 #000 !important; }
      `}</style>
      <div
        role="dialog"
        aria-label="Cookie consent"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          display: "flex",
          justifyContent: "center",
          animation: visible ? "cookie-slide-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" : "none",
          opacity: visible ? undefined : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <div style={{
          maxWidth: "520px",
          width: "100%",
          background: "#FFFDF7",
          border: "2.5px solid #000",
          borderRadius: "20px",
          padding: "1.75rem 2rem",
          boxShadow: "6px 6px 0px #000",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🍪</span>
            <span style={{ fontSize: "1.125rem", fontWeight: 800, color: "#000" }}>Privacy</span>
          </div>

          <p style={{ fontSize: "0.9375rem", lineHeight: 1.6, color: "#333", margin: "0 0 0.625rem", fontWeight: 500 }}>
            This site uses essential technical cookies only. No tracking. No advertising.
          </p>

          <p style={{ fontSize: "0.75rem", lineHeight: 1.5, color: "#888", margin: "0 0 1.5rem" }}>
            Data controller: Clarity Structures Digital S.L., Madrid, Spain.{" "}
            <a href="/en/privacidad" style={{ color: "#6C3AFF", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "2px", textDecorationThickness: "2px" }}>
              Privacy policy
            </a>
          </p>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="sc-accept"
              onClick={handleAccept}
              style={{
                flex: 1, padding: "0.875rem 1.5rem",
                background: "linear-gradient(135deg, #6C3AFF, #3A86FF, #6C3AFF)",
                backgroundSize: "200% 200%",
                animation: "cookie-gradient 3s ease infinite",
                color: "#fff", border: "2.5px solid #000", borderRadius: "12px",
                fontSize: "0.875rem", fontWeight: 800, textTransform: "uppercase" as const,
                cursor: "pointer", boxShadow: "2px 2px 0px #000", transition: "transform 0.15s, box-shadow 0.15s",
              }}
            >
              ✓ Accept
            </button>
            <button
              className="sc-reject"
              onClick={handleReject}
              style={{
                padding: "0.875rem 1.25rem",
                background: "#f5f5f0", color: "#666",
                border: "2.5px solid #000", borderRadius: "12px",
                fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
                boxShadow: "2px 2px 0px #000", transition: "all 0.15s",
              }}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
