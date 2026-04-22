import { NextRequest, NextResponse } from "next/server"
import { findById } from "@/domain/orders/order-repository"
import {
  findTicketAssetByOrderId,
  markTicketAssetMinted,
} from "@/adapters/tickets/ticket-asset-repository"

type Params = {
  params: Promise<{
    id: string
  }>
}

type MintBody = {
  contractAddress?: string
  tokenId?: string
  chainId?: number
}

function isLikelyAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

export async function POST(req: NextRequest, context: Params) {
  const { id } = await context.params

  const order = await findById(id)
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 })
  }

  const asset = await findTicketAssetByOrderId(order.id)
  if (!asset) {
    return NextResponse.json(
      { error: "Ticket asset not found for order" },
      { status: 404 },
    )
  }

  if (asset.status !== "pending_mint") {
    return NextResponse.json(
      { error: "Ticket asset is not ready to mint" },
      { status: 409 },
    )
  }

  if (!asset.ownerWallet) {
    return NextResponse.json(
      { error: "Ticket asset has no bound wallet" },
      { status: 409 },
    )
  }

  let body: MintBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const contractAddress = body.contractAddress?.trim() ?? ""
  const tokenId = body.tokenId?.trim() ?? ""
  const chainId = body.chainId

  if (!contractAddress || !isLikelyAddress(contractAddress)) {
    return NextResponse.json(
      { error: "Invalid contractAddress" },
      { status: 400 },
    )
  }

  if (!tokenId) {
    return NextResponse.json(
      { error: "Invalid tokenId" },
      { status: 400 },
    )
  }

  if (!Number.isInteger(chainId) || (chainId as number) <= 0) {
    return NextResponse.json(
      { error: "Invalid chainId" },
      { status: 400 },
    )
  }

  await markTicketAssetMinted({
    orderId: order.id,
    ownerWallet: asset.ownerWallet,
    contractAddress,
    tokenId,
    chainId: chainId as number,
  })

  const updated = await findTicketAssetByOrderId(order.id)

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    ticketAsset: updated,
  })
}
