"use client"

import { useState, useCallback } from "react"
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
  document.cookie = `${COOKIE_KEY}=${value}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
}

export function CookieBanner() {
  const t = useTranslations("cookie")
  const [dismissed, setDismissed] = useState(hasConsent)

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
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
    >
      <div className="max-w-3xl mx-auto border border-[var(--sn-border-2)]
        bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-[var(--sn-muted)] leading-relaxed">
              {t("message")}{" "}
              <Link
                href="/privacidad"
                className="underline hover:text-[var(--sn-text)] transition-colors"
              >
                {t("privacyPolicy")}
              </Link>
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleReject}
              className="px-5 py-2 text-xs font-medium tracking-wide uppercase
                border border-[var(--sn-border-2)] text-[var(--sn-muted)]
                hover:text-[var(--sn-text)] hover:border-[var(--sn-text)] transition-colors"
            >
              {t("reject")}
            </button>
            <button
              onClick={handleAccept}
              className="px-5 py-2 text-xs font-medium tracking-wide uppercase
                bg-[var(--sn-text)] text-white
                hover:bg-[var(--sn-muted)] transition-colors"
            >
              {t("accept")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
