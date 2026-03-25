"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import SystemStatusCard from "@/ui/components/dashboard/SystemStatusCard"

type SystemData = {
  status: string
  dbLatencyMs: number | null
  timestamp: string
}

const DEFAULT_SYSTEM: SystemData = { status: "unknown", dbLatencyMs: null, timestamp: "" }

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}

export default function DashboardPage() {
  const [system, setSystem] = useState<SystemData>(DEFAULT_SYSTEM)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const data = await safeFetch<SystemData>("/api/admin/system", DEFAULT_SYSTEM)
      setSystem(data)
      setLoading(false)
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-12">
        <div>
          <p className="editorial-label mb-2">control center</p>
          <h1 className="editorial-h2">platform dashboard</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-sm text-gray-400 tracking-wide">cargando datos…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div>
        <p className="editorial-label mb-2">control center</p>
        <h1 className="editorial-h2">platform dashboard</h1>
      </div>

      <SystemStatusCard data={system} />

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/catalog"
          className="bg-white border border-[var(--sn-border)] p-8 hover:border-black transition"
        >
          <p className="editorial-label mb-2">browse</p>
          <p className="text-lg font-medium">catalog</p>
        </Link>

        <Link
          href="/dashboard/settings"
          className="bg-white border border-[var(--sn-border)] p-8 hover:border-black transition"
        >
          <p className="editorial-label mb-2">configure</p>
          <p className="text-lg font-medium">settings</p>
        </Link>
      </div>
    </div>
  )
}
