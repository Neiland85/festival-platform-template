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
  // Initialize as true (dismissed) to match server render — avoids hydration mismatch
  const [dismissed, setDismissed] = useState(true)
  const [visible, setVisible] = useState(false)

  // Check cookie consent on client only, after hydration
  useEffect(() => {
    if (!hasConsent()) {
      setDismissed(false)
    }
  }, [])

  useEffect(() => {
    if (!dismissed) {
      const timer = setTimeout(() => setVisible(true), 500)
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
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          background: "#FFFDF7",
          border: "2.5px solid #000",
          borderRadius: "20px",
          padding: "1.75rem 2rem",
          boxShadow: "6px 6px 0px #000",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "1.5rem" }}>🍪</span>
          <span style={{
            fontSize: "1.125rem",
            fontWeight: 800,
            color: "#000",
            letterSpacing: "-0.02em",
          }}>
            {t("title")}
          </span>
        </div>

        {/* Message */}
        <p style={{
          fontSize: "0.9375rem",
          lineHeight: 1.6,
          color: "#333",
          margin: "0 0 0.625rem",
          fontWeight: 500,
        }}>
          {t("message")}
        </p>

        {/* Legal + Privacy link */}
        <p style={{
          fontSize: "0.75rem",
          lineHeight: 1.5,
          color: "#888",
          margin: "0 0 1.5rem",
        }}>
          {t("controller")}{" "}
          <Link
            href="/privacidad"
            style={{
              color: "#6C3AFF",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              textDecorationThickness: "2px",
            }}
          >
            {t("privacyPolicy")}
          </Link>
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="cookie-accept-btn"
            onClick={handleAccept}
            style={{
              flex: 1,
              padding: "0.875rem 1.5rem",
              color: "#fff",
              border: "2.5px solid #000",
              borderRadius: "12px",
              fontSize: "0.875rem",
              fontWeight: 800,
              letterSpacing: "0.03em",
              textTransform: "uppercase" as const,
              cursor: "pointer",
              boxShadow: "2px 2px 0px #000",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          >
            ✓ {t("accept")}
          </button>
          <button
            className="cookie-reject-btn"
            onClick={handleReject}
            style={{
              padding: "0.875rem 1.25rem",
              background: "#f5f5f0",
              color: "#666",
              border: "2.5px solid #000",
              borderRadius: "12px",
              fontSize: "0.8125rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "2px 2px 0px #000",
              transition: "all 0.15s",
            }}
          >
            {t("reject")}
          </button>
        </div>
      </div>
    </div>
  )
}
