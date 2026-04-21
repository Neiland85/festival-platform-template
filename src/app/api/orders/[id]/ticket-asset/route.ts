import { NextRequest, NextResponse } from "next/server"
import { findById } from "@/domain/orders/order-repository"
import { findTicketAssetByOrderId } from "@/adapters/tickets/ticket-asset-repository"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_req: NextRequest, context: Params) {
  const { id } = await context.params

  const order = await findById(id)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const asset = await findTicketAssetByOrderId(order.id)

  return NextResponse.json({
    orderId: order.id,
    orderStatus: order.status,
    ticketAsset: asset,
  })
}
