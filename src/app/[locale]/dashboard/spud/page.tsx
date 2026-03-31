"use client"

import { useCallback, useEffect, useState } from "react"
import SpudTabLayout from "@/ui/components/dashboard/SpudTabLayout"
import SpudScoreTable from "@/ui/components/dashboard/SpudScoreTable"
import SpudRunsList from "@/ui/components/dashboard/SpudRunsList"
import SpudSegmentsList from "@/ui/components/dashboard/SpudSegmentsList"
import SpudApprovalQueue from "@/ui/components/dashboard/SpudApprovalQueue"
import SpudOutcomesList from "@/ui/components/dashboard/SpudOutcomesList"
import SpudCampaignsList from "@/ui/components/dashboard/SpudCampaignsList"
import SpudMemoryView from "@/ui/components/dashboard/SpudMemoryView"

/* ─── Types (matching API responses) ─── */

type ScoreEntry = {
  id: string; leadId: string; score: number; tier: string
  factors: Record<string, number>; scoredAt: string
}
type RunEntry = {
  id: string; type: string; status: string; createdAt: string
  startedAt: string | null; completedAt: string | null
  output: Record<string, unknown> | null; error: string | null
}
type SegmentEntry = {
  id: string; name: string; description: string | null
  filters: Record<string, unknown>; leadCount: number
  createdBy: string; createdAt: string
}
type ApprovalEntry = {
  id: string; type: string; status: string
  approvalStatus: string | null; approvalRequestedBy: string | null
  approvalDecidedBy: string | null; approvalReason: string | null
  createdAt: string; input: Record<string, unknown>
}
type OutcomeEntry = {
  id: string; leadId: string; orderId: string
  scoreAtConversion: number | null; tierAtConversion: string | null
  convertedAt: string
}
type CampaignEntry = {
  id: string; memoryKey: string; segmentId: string | null
  segmentName: string | null; subject: string | null
  body: string | null; reasoning: string | null
  tone: string | null; language: string | null
  modelUsed: string | null; generatedAt: string
}
type MemoryEntry = {
  id: string; category: string; memoryKey: string
  value: unknown; expiresAt: string | null; updatedAt: string
}

/* ─── Helpers ─── */

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return fallback
    return await res.json()
  } catch {
    return fallback
  }
}

/* ─── Page ─── */

export default function SpudDashboardPage() {
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [runs, setRuns] = useState<RunEntry[]>([])
  const [segments, setSegments] = useState<SegmentEntry[]>([])
  const [approvals, setApprovals] = useState<ApprovalEntry[]>([])
  const [outcomes, setOutcomes] = useState<OutcomeEntry[]>([])
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([])
  const [memory, setMemory] = useState<MemoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const [scoresData, runsData, segmentsData, approvalsData, outcomesData, campaignsData, memoryData] =
      await Promise.all([
        safeFetch<{ scores: ScoreEntry[] }>("/api/admin/spud/scores?limit=50", { scores: [] }),
        safeFetch<{ runs: RunEntry[] }>("/api/admin/spud/runs?limit=20", { runs: [] }),
        safeFetch<{ segments: SegmentEntry[] }>("/api/admin/spud/segments?limit=20", { segments: [] }),
        safeFetch<{ approvals: ApprovalEntry[] }>("/api/admin/spud/approvals?limit=20", { approvals: [] }),
        safeFetch<{ outcomes: OutcomeEntry[] }>("/api/admin/spud/outcomes?limit=50", { outcomes: [] }),
        safeFetch<{ campaigns: CampaignEntry[] }>("/api/admin/spud/campaigns?limit=20", { campaigns: [] }),
        safeFetch<{ entries: MemoryEntry[] }>("/api/admin/spud/memory?limit=50", { entries: [] }),
      ])
    setScores(scoresData.scores)
    setRuns(runsData.runs)
    setSegments(segmentsData.segments)
    setApprovals(approvalsData.approvals)
    setOutcomes(outcomesData.outcomes)
    setCampaigns(campaignsData.campaigns)
    setMemory(memoryData.entries)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDecide = async (runId: string, decision: "approved" | "rejected") => {
    await fetch(`/api/admin/spud/runs/${runId}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    })
    loadData()
  }

  if (loading) {
    return (
      <div className="space-y-12">
        <div>
          <p className="editorial-label mb-2">intelligence</p>
          <h1 className="editorial-h2">SPUD</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-sm text-gray-400 tracking-wide">
            cargando datos...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <div>
        <p className="editorial-label mb-2">intelligence</p>
        <h1 className="editorial-h2">SPUD</h1>
      </div>

      <SpudTabLayout
        defaultTab="scores"
        tabs={[
          {
            id: "scores",
            label: "Scores",
            content: <SpudScoreTable scores={scores} />,
          },
          {
            id: "runs",
            label: "Runs",
            content: <SpudRunsList runs={runs} />,
          },
          {
            id: "segments",
            label: "Segments",
            content: <SpudSegmentsList segments={segments} />,
          },
          {
            id: "approvals",
            label: "Approvals",
            content: (
              <SpudApprovalQueue
                approvals={approvals}
                onDecide={handleDecide}
              />
            ),
          },
          {
            id: "campaigns",
            label: "Campaigns",
            content: <SpudCampaignsList campaigns={campaigns} />,
          },
          {
            id: "outcomes",
            label: "Outcomes",
            content: <SpudOutcomesList outcomes={outcomes} />,
          },
          {
            id: "memory",
            label: "Memory",
            content: <SpudMemoryView entries={memory} />,
          },
        ]}
      />
    </div>
  )
}
