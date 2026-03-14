"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import LeadsChart from "@/ui/components/dashboard/LeadsChart"
import ForecastCard from "@/ui/components/dashboard/ForecastCard"
import TrendingCard from "@/ui/components/dashboard/TrendingCard"
import ViralEventCard from "@/ui/components/dashboard/ViralEventCard"
import SystemStatusCard from "@/ui/components/dashboard/SystemStatusCard"
import AttendanceForecastCard from "@/ui/components/dashboard/AttendanceForecastCard"
import FestivalHealthCard from "@/ui/components/dashboard/FestivalHealthCard"

type HealthData = {
  totalLeads: number
  last24h: number
  capacity: number
  occupancy: number
  momentum: string
}

type SystemData = {
  status: string
  dbLatencyMs: number | null
  timestamp: string
}

type LeadsChartData = {
  leadsTotal: number
  lastHour: number
  last24h: number
}

type ForecastEvent = {
  id: string
  title: string
  leads: number
  predictedAttendance: number
  capacity: number
  occupancy: number
}

type TrendingData = {
  title?: string
  leads?: number
}

type ViralData = {
  title?: string
}

type ForecastData = {
  title?: string
  eta?: string
}

interface DashboardState {
  metrics: { leadsTotal: number; events: LeadsChartData[] }
  forecast: ForecastEvent[]
  trending: TrendingData | null
  viral: ViralData | null
  system: SystemData
  health: HealthData | null
  soldOut: ForecastData | null
  loading: boolean
  error: string | null
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
  const [state, setState] = useState<DashboardState>({
    metrics: { leadsTotal: 0, events: [] },
    forecast: [],
    trending: null,
    viral: null,
    system: DEFAULT_SYSTEM,
    health: null,
    soldOut: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [metrics, forecast, trending, system, health] = await Promise.all([
          safeFetch("/api/admin/metrics", { leadsTotal: 0, events: [] as LeadsChartData[] }),
          safeFetch<ForecastEvent[]>("/api/admin/forecast", []),
          safeFetch<TrendingData | null>("/api/admin/trending", null),
          safeFetch<SystemData>("/api/admin/system", DEFAULT_SYSTEM),
          safeFetch<HealthData | null>("/api/admin/health", null),
        ])

        setState({
          metrics,
          forecast,
          trending,
          viral: trending,
          system,
          health,
          soldOut: null,
          loading: false,
          error: null,
        })
      } catch {
        setState((prev) => ({ ...prev, loading: false, error: "Error cargando datos del dashboard" }))
      }
    }

    loadDashboard()
  }, [])

  if (state.loading) {
    return (
      <div className="space-y-12">
        <div>
          <p className="editorial-label mb-2">control center</p>
          <h1 className="editorial-h2">solaris nerja dashboard</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-sm text-gray-400 tracking-wide">cargando datos…</div>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="space-y-12">
        <div>
          <p className="editorial-label mb-2">control center</p>
          <h1 className="editorial-h2">solaris nerja dashboard</h1>
        </div>
        <div className="bg-red-50 border border-red-200 p-6 text-sm text-red-700">
          {state.error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div>
        <p className="editorial-label mb-2">control center</p>
        <h1 className="editorial-h2">solaris nerja dashboard</h1>
      </div>

      {state.health && <FestivalHealthCard data={state.health} />}

      <SystemStatusCard data={state.system} />

      <LeadsChart data={state.metrics.events[0] ?? { leadsTotal: 0, lastHour: 0, last24h: 0 }} />

      <ForecastCard data={state.soldOut} />

      <TrendingCard data={state.trending} />

      <ViralEventCard data={state.viral} />

      <AttendanceForecastCard data={state.forecast} />

      <div className="grid md:grid-cols-2 gap-6">
        <Link
          href="/dashboard/events"
          className="bg-white border border-[var(--sn-border)] p-8 hover:border-black transition"
        >
          <p className="editorial-label mb-2">gestionar</p>
          <p className="text-lg font-medium">eventos</p>
        </Link>

        <Link
          href="/dashboard/leads"
          className="bg-white border border-[var(--sn-border)] p-8 hover:border-black transition"
        >
          <p className="editorial-label mb-2">marketing</p>
          <p className="text-lg font-medium">leads</p>
        </Link>
      </div>
    </div>
  )
}
