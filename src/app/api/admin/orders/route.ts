import { type NextRequest, NextResponse } from "next/server"
import { findAllOrders, findOrdersByEvent } from "@/adapters/db/order-repository"

/**
 * GET /api/admin/orders
 *
 * List orders with optional event filter.
 * Protected by admin auth in middleware.
 *
 * Query params:
 *   - eventId: filter by event
 *   - limit: max results (default 100)
 *   - offset: pagination offset (default 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const eventId = searchParams.get("eventId")
    const limit = parseInt(searchParams.get("limit") ?? "100", 10)
    const offset = parseInt(searchParams.get("offset") ?? "0", 10)

    const orders = eventId
      ? await findOrdersByEvent(eventId)
      : await findAllOrders(limit, offset)

    // Aggregate stats
    const totalRevenue = orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.amountCents, 0)

    const totalTickets = orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + o.quantity, 0)

    return NextResponse.json({
      orders,
      stats: {
        totalOrders: orders.length,
        completedOrders: orders.filter((o) => o.status === "completed").length,
        totalRevenue,
        totalTickets,
      },
    })
  } catch (err) {
    console.error("[admin/orders] Error:", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    )
  }
}
