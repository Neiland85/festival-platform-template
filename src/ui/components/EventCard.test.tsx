// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import EventCard from "./EventCard"

describe("EventCard", () => {
  const mockEvent = {
    id: "evt-001",
    title: "DJ Set — Solaris Opening",
    time: "22:00 — 02:00",
    description: "Sesión de apertura del festival con artistas locales e internacionales.",
  }

  it("renders event title", () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByText(mockEvent.title)).toBeInTheDocument()
  })

  it("renders event time", () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByText(mockEvent.time)).toBeInTheDocument()
  })

  it("renders event description", () => {
    render(<EventCard event={mockEvent} />)
    expect(screen.getByText(mockEvent.description)).toBeInTheDocument()
  })

  it("renders title as h3 heading", () => {
    render(<EventCard event={mockEvent} />)
    const heading = screen.getByRole("heading", { level: 3 })
    expect(heading).toHaveTextContent(mockEvent.title)
  })
})
