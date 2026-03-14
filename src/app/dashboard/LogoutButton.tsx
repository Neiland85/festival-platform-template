"use client"

import { useRouter } from "next/navigation"

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[var(--sn-muted)] hover:text-[var(--sn-text)] transition text-sm tracking-wide"
    >
      salir
    </button>
  )
}
