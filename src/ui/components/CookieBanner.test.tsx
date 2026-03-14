// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CookieBanner } from "./CookieBanner"
import { IntlWrapper } from "@/test/i18n-wrapper"

// Mock i18n navigation Link to render a plain <a>
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

describe("CookieBanner", () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie = "sn_cookie_consent=; max-age=0; path=/"
  })

  it("renders banner when no consent cookie exists", () => {
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText(/usamos cookies/i)).toBeInTheDocument()
  })

  it("shows accept and reject buttons", () => {
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    expect(screen.getByRole("button", { name: /aceptar/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /rechazar/i })).toBeInTheDocument()
  })

  it("includes link to privacy policy", () => {
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    const link = screen.getByRole("link", { name: /privacidad/i })
    expect(link).toHaveAttribute("href", "/privacidad")
  })

  it("dismisses banner on accept", async () => {
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /aceptar/i }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.cookie).toContain("sn_cookie_consent=accepted")
  })

  it("dismisses banner on reject", async () => {
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /rechazar/i }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(document.cookie).toContain("sn_cookie_consent=rejected")
  })

  it("does not render when consent already given", () => {
    document.cookie = "sn_cookie_consent=accepted; path=/"
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("does not render when consent already rejected", () => {
    document.cookie = "sn_cookie_consent=rejected; path=/"
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("has correct aria-label for accessibility", () => {
    render(<IntlWrapper><CookieBanner /></IntlWrapper>)
    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Consentimiento de cookies"
    )
  })
})
