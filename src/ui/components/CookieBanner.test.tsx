// @vitest-environment jsdom
import React from "react"
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CookieBanner } from "./CookieBanner"
import { I18nWrapper } from "@/test/i18n-wrapper"

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}))

describe("CookieBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.cookie = "sn_cookie_consent=; max-age=0; path=/"
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function renderAndShow() {
    render(<I18nWrapper><CookieBanner /></I18nWrapper>)
    // Advance past the 300ms animation delay to make banner interactive
    act(() => { vi.advanceTimersByTime(400) })
  }

  it("renders banner when no consent cookie exists", () => {
    renderAndShow()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/cookies/i)).toBeInTheDocument()
  })

  it("shows accept and reject buttons", () => {
    renderAndShow()
    expect(screen.getByRole("button", { name: /aceptar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeInTheDocument()
  })

  it("includes link to privacy policy", () => {
    renderAndShow()
    const link = screen.getByRole("link", { name: /privacidad/i })
    expect(link).toHaveAttribute("href", "/privacidad")
  })

  it("dismisses banner on accept", () => {
    renderAndShow()
    // Use fireEvent instead of userEvent to bypass pointer-events check
    const btn = screen.getByRole("button", { name: /aceptar/i })
    act(() => { btn.click() })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.cookie).toContain("sn_cookie_consent=accepted")
  })

  it("dismisses banner on reject", () => {
    renderAndShow()
    const btn = screen.getByRole("button", { name: /rechazar/i })
    act(() => { btn.click() })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.cookie).toContain("sn_cookie_consent=rejected")
  })

  it("does not render when consent already given", () => {
    document.cookie = "sn_cookie_consent=accepted; path=/"
    render(<I18nWrapper><CookieBanner /></I18nWrapper>)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not render when consent already rejected", () => {
    document.cookie = "sn_cookie_consent=rejected; path=/"
    render(<I18nWrapper><CookieBanner /></I18nWrapper>)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("has correct aria-label for accessibility", () => {
    renderAndShow()
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-label", "Consentimiento de cookies")
  })

  it("displays legal information", () => {
    renderAndShow()
    expect(screen.getByText(/Clarity Structures Digital S.L/)).toBeInTheDocument()
  })
})
