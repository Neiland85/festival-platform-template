"use client"

import { useState } from "react"

type CampaignEntry = {
  id: string
  memoryKey: string
  segmentId: string | null
  segmentName: string | null
  subject: string | null
  body: string | null
  reasoning: string | null
  tone: string | null
  language: string | null
  modelUsed: string | null
  generatedAt: string
}

type Props = {
  campaigns: CampaignEntry[]
}

export default function SpudCampaignsList({ campaigns }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (campaigns.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">campaigns</p>
        <p className="text-sm text-[var(--sn-muted)]">
          no campaign drafts yet. create a run with goal &quot;generate_campaign&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">campaigns</p>

      <div className="space-y-4">
        {campaigns.map((c) => {
          const isExpanded = expandedId === c.id

          return (
            <div
              key={c.id}
              className="border border-[var(--sn-border)] rounded-sm overflow-hidden"
            >
              {/* Header — clickable */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {c.subject ?? "untitled"}
                    </p>
                    <p className="text-xs text-[var(--sn-muted)] mt-0.5">
                      {c.segmentName ?? "unknown segment"}
                      {c.tone && ` — ${c.tone}`}
                      {c.language && ` (${c.language})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.modelUsed && (
                      <span className="text-xs text-[var(--sn-muted)]">
                        {c.modelUsed}
                      </span>
                    )}
                    <span className="text-xs text-[var(--sn-muted)]">
                      {new Date(c.generatedAt).toLocaleDateString()}
                    </span>
                    <span className="text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-[var(--sn-border)]">
                  {c.reasoning && (
                    <div className="mt-3 mb-3 p-3 bg-amber-50 rounded text-xs text-amber-800">
                      <strong>Reasoning:</strong> {c.reasoning}
                    </div>
                  )}
                  <div className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">
                    {c.body ?? "no body"}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
