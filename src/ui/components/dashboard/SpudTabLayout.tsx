"use client"

import { useState } from "react"

type Tab = {
  id: string
  label: string
  content: React.ReactNode
}

type Props = {
  tabs: Tab[]
  defaultTab?: string
}

export default function SpudTabLayout({ tabs, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "")

  const current = tabs.find((t) => t.id === activeTab)

  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--sn-border)] mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm tracking-wide transition border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-black text-black font-medium"
                : "border-transparent text-[var(--sn-muted)] hover:text-[var(--sn-text)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {current?.content}
    </div>
  )
}
