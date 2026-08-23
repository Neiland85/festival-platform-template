import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/requireAdmin"
import { verifyCsrf } from "@/lib/security/verifyCsrf"
import { findById } from "@/domain/orders/order-repository"
import {
  findTicketAssetByOrderId,
  markTicketAssetPendingMint,
} from "@/adapters/tickets/ticket-asset-repository"

type Params = {
  params: Promise<{
    id: string
  }>
}

type BindWalletBody = {
  wallet?: string
  chainId?: number
}

function isLikelyWallet(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export async function POST(req: NextRequest, context: Params) {
  let isAdmin = false
  try {
    isAdmin = await requireAdmin(req)
  } catch {
    isAdmin = false
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const { id } = await context.params

  const order = await findById(id)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  if (order.status !== "completed") {
    return NextResponse.json(
      { error: "Wallet can only be bound to completed orders" },
      { status: 409 },
    )
  }

  const asset = await findTicketAssetByOrderId(order.id)
  if (!asset) {
    return NextResponse.json(
      { error: "Ticket asset not found for order" },
      { status: 404 },
    )
  }

  let body: BindWalletBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const wallet = body.wallet?.trim() ?? ""
  const chainId = body.chainId

  if (!wallet || !isLikelyWallet(wallet)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 },
    )
  }

  if (!Number.isInteger(chainId) || (chainId as number) <= 0) {
    return NextResponse.json(
      { error: "Invalid chainId" },
      { status: 400 },
    )
  }

  if (asset.status === "minted") {
    return NextResponse.json(
      { error: "Ticket asset already minted" },
      { status: 409 },
    )
  }

  await markTicketAssetPendingMint({
    orderId: order.id,
    ownerWallet: wallet,
    chainId: chainId as number,
  })

  const updated = await findTicketAssetByOrderId(order.id)

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    ticketAsset: updated,
  })
}
