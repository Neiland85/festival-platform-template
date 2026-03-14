"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Order = {
  id: string
  eventId: string
  customerEmail: string
  amountCents: number
  currency: string
  status: string
  quantity: number
  createdAt: string
}

type OrderStats = {
  totalOrders: number
  completedOrders: number
  totalRevenue: number
  totalTickets: number
}

type OrdersData = {
  orders: Order[]
  stats: OrderStats
}

export default function OrdersDashboardPage() {
  const [data, setData] = useState<OrdersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/admin/orders", { cache: "no-store" })
        if (!res.ok) throw new Error("Failed to fetch orders")
        const json = (await res.json()) as OrdersData
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <p className="editorial-label mb-2">commerce</p>
          <h1 className="editorial-h2">orders</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="animate-pulse text-sm text-gray-400 tracking-wide">loading orders...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <p className="editorial-label mb-2">commerce</p>
          <h1 className="editorial-h2">orders</h1>
        </div>
        <div className="bg-red-50 border border-red-200 p-6 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  const stats = data?.stats
  const orders = data?.orders ?? []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="editorial-label mb-2">commerce</p>
          <h1 className="editorial-h2">orders</h1>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-black transition"
        >
          &larr; dashboard
        </Link>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-[var(--sn-border)] p-6">
            <p className="editorial-label mb-1">total orders</p>
            <p className="text-2xl font-medium">{stats.totalOrders}</p>
          </div>
          <div className="bg-white border border-[var(--sn-border)] p-6">
            <p className="editorial-label mb-1">completed</p>
            <p className="text-2xl font-medium">{stats.completedOrders}</p>
          </div>
          <div className="bg-white border border-[var(--sn-border)] p-6">
            <p className="editorial-label mb-1">revenue</p>
            <p className="text-2xl font-medium">
              {(stats.totalRevenue / 100).toFixed(2)} &euro;
            </p>
          </div>
          <div className="bg-white border border-[var(--sn-border)] p-6">
            <p className="editorial-label mb-1">tickets sold</p>
            <p className="text-2xl font-medium">{stats.totalTickets}</p>
          </div>
        </div>
      )}

      {/* Orders table */}
      {orders.length === 0 ? (
        <div className="bg-white border border-[var(--sn-border)] p-12 text-center">
          <p className="text-gray-400">No orders yet</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--sn-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--sn-border)] text-left">
                <th className="px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 font-medium text-gray-500">Event</th>
                <th className="px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-500">Qty</th>
                <th className="px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-[var(--sn-border)] last:border-0">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium">{order.eventId}</td>
                  <td className="px-4 py-3 text-gray-600">{order.customerEmail}</td>
                  <td className="px-4 py-3">
                    {(order.amountCents / 100).toFixed(2)} {order.currency.toUpperCase()}
                  </td>
                  <td className="px-4 py-3">{order.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded ${
                        order.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : order.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
