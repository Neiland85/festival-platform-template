// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PromoFormSection from "./PromoFormSection"
import { IntlWrapper } from "@/test/i18n-wrapper"

// Mock i18n navigation Link
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

// Mock tracking
vi.mock("@/lib/tracking", () => ({
  trackEvent: vi.fn(),
}))

describe("PromoFormSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders CTA state by default", () => {
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    expect(screen.getByRole("button", { name: /promociones limitadas/i })).toBeInTheDocument()
  })

  it("transitions from CTA to RGPD on button click", async () => {
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    expect(screen.getByText(/protección de tus datos/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /promociones limitadas/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /volver/i })).toBeInTheDocument()
  })

  it("transitions from RGPD to form on accept", async () => {
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    // CTA → RGPD
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))
    // RGPD → Form
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument()
  })

  it("returns from RGPD to CTA on Volver click", async () => {
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))
    await user.click(screen.getByRole("button", { name: /volver/i }))

    expect(screen.getByRole("button", { name: /promociones limitadas/i })).toBeInTheDocument()
  })

  it("shows success state after successful submission", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    // Navigate to form
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    // Fill form
    await user.type(screen.getByLabelText(/nombre \*/i), "Ana")
    await user.type(screen.getByLabelText(/apellidos/i), "García")
    await user.type(screen.getByLabelText(/email/i), "ana@example.com")
    await user.type(screen.getByLabelText(/teléfono/i), "+34600000000")

    // Submit
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    await waitFor(() => {
      expect(screen.getByText(/estás dentro/i)).toBeInTheDocument()
    })
  })

  it("shows error state on failed submission", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    // Navigate to form
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    // Fill form
    await user.type(screen.getByLabelText(/nombre \*/i), "Ana")
    await user.type(screen.getByLabelText(/apellidos/i), "García")
    await user.type(screen.getByLabelText(/email/i), "ana@example.com")
    await user.type(screen.getByLabelText(/teléfono/i), "+34600000000")

    // Submit
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    await waitFor(() => {
      expect(screen.getByText(/ha ocurrido un error/i)).toBeInTheDocument()
    })
  })

  it("shows retry button on error state", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"))
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    await user.type(screen.getByLabelText(/nombre \*/i), "Test")
    await user.type(screen.getByLabelText(/apellidos/i), "User")
    await user.type(screen.getByLabelText(/email/i), "t@t.com")
    await user.type(screen.getByLabelText(/teléfono/i), "123")

    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument()
    })
  })

  it("disables submit button while sending", async () => {
    // Never resolve to keep sending state
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}))
    render(<IntlWrapper><PromoFormSection /></IntlWrapper>)
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))
    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    await user.type(screen.getByLabelText(/nombre \*/i), "Test")
    await user.type(screen.getByLabelText(/apellidos/i), "User")
    await user.type(screen.getByLabelText(/email/i), "t@t.com")
    await user.type(screen.getByLabelText(/teléfono/i), "123")

    await user.click(screen.getByRole("button", { name: /promociones limitadas/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled()
    })
  })
})
