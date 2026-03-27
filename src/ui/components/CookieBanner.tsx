"use client"

import { useState, useCallback, useEffect } from "react"
import { Link } from "@/i18n/navigation"
import { useTranslations } from "next-intl"

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

export function CookieBanner() {
  const t = useTranslations("cookie")
  const [dismissed, setDismissed] = useState(hasConsent)
  const [visible, setVisible] = useState(false)

  // Slide-up animation after mount
  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 300)
      return () => clearTimeout(timer)
    }
  }, [dismissed])

  const handleAccept = useCallback(() => {
    setConsent("accepted")
    setDismissed(true)
  }, [])

  const handleReject = useCallback(() => {
    setConsent("rejected")
    setDismissed(true)
  }, [])

  if (dismissed) return null

  return (
    <div
      role="dialog"
      aria-label={t("ariaLabel")}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: "1rem",
        transform: visible ? "translateY(0)" : "translateY(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          background: "rgba(10, 10, 10, 0.85)",
          backdropFilter: "blur(20px) saturate(1.2)",
          WebkitBackdropFilter: "blur(20px) saturate(1.2)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "16px",
          padding: "1.5rem 2rem",
          boxShadow: "0 -4px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.03) inset",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4141C6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: "#4141C6",
          }}>
            {t("title")}
          </span>
        </div>

        {/* Body */}
        <p style={{
          fontSize: "0.8125rem",
          lineHeight: 1.7,
          color: "rgba(255, 255, 255, 0.65)",
          margin: "0 0 0.5rem",
        }}>
          {t("message")}{" "}
          <Link
            href="/privacidad"
            style={{
              color: "#4141C6",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            {t("privacyPolicy")}
          </Link>
        </p>

        <p style={{
          fontSize: "0.6875rem",
          lineHeight: 1.6,
          color: "rgba(255, 255, 255, 0.35)",
          margin: "0 0 1.25rem",
        }}>
          {t("legal")} — {t("controller")}
        </p>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={handleAccept}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#4141C6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "background 0.2s, transform 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#5252D4" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#4141C6" }}
          >
            {t("accept")}
          </button>
          <button
            onClick={handleReject}
            style={{
              padding: "0.625rem 1.5rem",
              background: "transparent",
              color: "rgba(255, 255, 255, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              fontSize: "0.75rem",
              fontWeight: 500,
              letterSpacing: "0.05em",
              cursor: "pointer",
              transition: "border-color 0.2s, color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
              e.currentTarget.style.color = "rgba(255,255,255,0.8)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"
              e.currentTarget.style.color = "rgba(255,255,255,0.5)"
            }}
          >
            {t("reject")}
          </button>
        </div>
      </div>
    </div>
  )
}
