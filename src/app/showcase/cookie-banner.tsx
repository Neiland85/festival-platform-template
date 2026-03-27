"use client"

import { useState, useCallback } from "react"

/**
 * Standalone cookie banner for /showcase (no IntlProvider needed).
 * GDPR-compliant: explicit accept/reject, 180-day cookie, no tracking until consent.
 */
export function ShowcaseCookieBanner() {
  const [visible, setVisible] = useState(() => {
    if (typeof document === "undefined") return false
    return !document.cookie.includes("sn_cookie_consent=")
  })

  const setCookie = useCallback((value: "accepted" | "rejected") => {
    const maxAge = 180 * 24 * 60 * 60
    document.cookie = `sn_cookie_consent=${value}; path=/; max-age=${maxAge}; SameSite=Lax`
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#111",
        borderTop: "1px solid #222",
        padding: "1.25rem 2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        flexWrap: "wrap",
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.8125rem",
        color: "#999",
      }}
    >
      <p style={{ margin: 0, maxWidth: "600px" }}>
        We use essential cookies only. No tracking, no ads.{" "}
        <a
          href="/en/privacidad"
          style={{ color: "#4141C6", textDecoration: "underline" }}
        >
          Privacy policy
        </a>
      </p>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => setCookie("accepted")}
          style={{
            padding: "0.5rem 1.25rem",
            background: "#4141C6",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8125rem",
            fontWeight: 600,
          }}
        >
          Accept
        </button>
        <button
          onClick={() => setCookie("rejected")}
          style={{
            padding: "0.5rem 1.25rem",
            background: "transparent",
            color: "#888",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.8125rem",
          }}
        >
          Reject
        </button>
      </div>
    </div>
  )
}
