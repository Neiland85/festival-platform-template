"use client"

type ApprovalEntry = {
  id: string
  type: string
  status: string
  approvalStatus: string | null
  approvalRequestedBy: string | null
  approvalDecidedBy: string | null
  approvalReason: string | null
  createdAt: string
  input: Record<string, unknown>
}

type Props = {
  approvals: ApprovalEntry[]
  onDecide?: (runId: string, decision: "approved" | "rejected") => void
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-700",
}

export default function SpudApprovalQueue({ approvals, onDecide }: Props) {
  if (approvals.length === 0) {
    return (
      <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
        <p className="editorial-label mb-2">approvals</p>
        <p className="text-sm text-[var(--sn-muted)]">no approval requests.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[var(--sn-border)] p-6 rounded-sm">
      <p className="editorial-label mb-4">approvals</p>

      <div className="space-y-3">
        {approvals.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between border-b border-[var(--sn-border)] last:border-0 pb-3 last:pb-0"
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                  STATUS_STYLES[a.approvalStatus ?? ""] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {a.approvalStatus ?? "none"}
              </span>
              <div>
                <p className="text-sm font-medium">
                  {(a.input as Record<string, string>)["goal"] ?? a.type}
                </p>
                <p className="text-xs text-[var(--sn-muted)]">
                  by {a.approvalRequestedBy ?? "system"} — {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {a.approvalStatus === "pending" && onDecide && (
              <div className="flex gap-2">
                <button
                  onClick={() => onDecide(a.id, "approved")}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  approve
                </button>
                <button
                  onClick={() => onDecide(a.id, "rejected")}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  reject
                </button>
              </div>
            )}

            {a.approvalDecidedBy && (
              <p className="text-xs text-[var(--sn-muted)]">
                by {a.approvalDecidedBy}
                {a.approvalReason && `: ${a.approvalReason}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
