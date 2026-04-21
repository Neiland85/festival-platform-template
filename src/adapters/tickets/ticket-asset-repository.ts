import { getPool } from "@/adapters/db/pool"

export type TicketAssetStatus =
  | "offchain"
  | "pending_mint"
  | "minted"
  | "failed"

export interface TicketAsset {
  id: string
  orderId: string
  eventId: string
  ownerEmail: string | null
  ownerWallet: string | null
  contractAddress: string | null
  tokenId: string | null
  chainId: number | null
  status: TicketAssetStatus
  mintedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function mapRow(row: Record<string, unknown>): TicketAsset {
  return {
    id: row["id"] as string,
    orderId: row["order_id"] as string,
    eventId: row["event_id"] as string,
    ownerEmail: (row["owner_email"] as string) ?? null,
    ownerWallet: (row["owner_wallet"] as string) ?? null,
    contractAddress: (row["contract_address"] as string) ?? null,
    tokenId: (row["token_id"] as string) ?? null,
    chainId: (row["chain_id"] as number) ?? null,
    status: row["status"] as TicketAssetStatus,
    mintedAt: row["minted_at"] ? new Date(row["minted_at"] as string) : null,
    createdAt: new Date(row["created_at"] as string),
    updatedAt: new Date(row["updated_at"] as string),
  }
}

/**
 * Crea el asset offchain inicial del pedido.
 * Idempotente por order_id gracias al índice único.
 */
export async function createOffchainTicketAsset(input: {
  orderId: string
  eventId: string
  ownerEmail: string
}): Promise<TicketAsset> {
  const pool = getPool()

  const result = await pool.query(
    `INSERT INTO ticket_assets (
      order_id,
      event_id,
      owner_email,
      status,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, 'offchain', NOW(), NOW())
    ON CONFLICT (order_id)
    DO UPDATE SET
      owner_email = EXCLUDED.owner_email,
      updated_at = NOW()
    RETURNING *`,
    [input.orderId, input.eventId, input.ownerEmail],
  )

  return mapRow(result.rows[0])
}

export async function findTicketAssetByOrderId(
  orderId: string,
): Promise<TicketAsset | null> {
  const pool = getPool()

  const result = await pool.query(
    `SELECT *
     FROM ticket_assets
     WHERE order_id = $1
     LIMIT 1`,
    [orderId],
  )

  return result.rows[0] ? mapRow(result.rows[0]) : null
}

export async function markTicketAssetPendingMint(input: {
  orderId: string
  ownerWallet: string
  chainId: number
}): Promise<void> {
  const pool = getPool()

  await pool.query(
    `UPDATE ticket_assets
     SET
       owner_wallet = $2,
       chain_id = $3,
       status = 'pending_mint',
       updated_at = NOW()
     WHERE order_id = $1`,
    [input.orderId, input.ownerWallet, input.chainId],
  )
}

export async function markTicketAssetMinted(input: {
  orderId: string
  ownerWallet: string
  contractAddress: string
  tokenId: string
  chainId: number
}): Promise<void> {
  const pool = getPool()

  await pool.query(
    `UPDATE ticket_assets
     SET
       owner_wallet = $2,
       contract_address = $3,
       token_id = $4,
       chain_id = $5,
       status = 'minted',
       minted_at = NOW(),
       updated_at = NOW()
     WHERE order_id = $1`,
    [input.orderId, input.ownerWallet, input.contractAddress, input.tokenId, input.chainId],
  )
}

export async function markTicketAssetFailed(input: {
  orderId: string
  ownerWallet?: string
}): Promise<void> {
  const pool = getPool()

  await pool.query(
    `UPDATE ticket_assets
     SET
       owner_wallet = COALESCE($2, owner_wallet),
       status = 'failed',
       updated_at = NOW()
     WHERE order_id = $1`,
    [input.orderId, input.ownerWallet ?? null],
  )
}
