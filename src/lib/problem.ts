import { NextResponse } from "next/server"

export type ProblemInput = {
  type: string
  title: string
  status: number
  detail?: string
  instance?: string
}

export function problem(p: ProblemInput) {
  return NextResponse.json(
    {
      type: p.type,
      title: p.title,
      status: p.status,
      detail: p.detail,
      instance: p.instance
    },
    {
      status: p.status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store"
      }
    }
  )
}
