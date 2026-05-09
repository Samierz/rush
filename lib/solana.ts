// lib/solana.ts — RPC bağlantısı ve retry'lı getTransaction yardımcıları
import { Connection, type ParsedTransactionWithMeta } from '@solana/web3.js'
import { HELIUS_RPC_URL, TX_TIMEOUT_MS } from './config'

// ─── Singleton bağlantı ────────────────────────────────────────────────────

let _connection: Connection | null = null

/** Devnet Connection singleton'ı döndürür. */
export function getConnection(): Connection {
  if (!_connection) {
    if (!HELIUS_RPC_URL) {
      throw new Error(
        'NEXT_PUBLIC_HELIUS_RPC ortam değişkeni tanımlı değil'
      )
    }
    _connection = new Connection(HELIUS_RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: TX_TIMEOUT_MS,
    })
  }
  return _connection
}

// ─── Retry helper ──────────────────────────────────────────────────────────

const RETRY_COUNT = 1        // Demo: tek deneme yeterli (mock fallback var)
const RETRY_DELAY_MS = 1_000 // Gerçek TX için 1s bekleme

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── getTransaction ────────────────────────────────────────────────────────

/**
 * Verilen TX hash'ini devnet'ten çeker.
 *
 * - AGENTS.md zorunluluğu: `maxSupportedTransactionVersion: 0`
 * - Sonuç `null` gelirse RETRY_COUNT kadar 3 saniye aralıkla yeniden dener.
 * - Tüm denemeler `null` ile biterse `null` döner (throw etmez).
 * - Ağ hatası fırlatılırsa exception yukarıya taşınır.
 */
export async function fetchTransactionWithRetry(
  txHash: string
): Promise<ParsedTransactionWithMeta | null> {
  const connection = getConnection()

  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    const tx = await connection.getParsedTransaction(txHash, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    })

    if (tx !== null) {
      return tx
    }

    // Son denemede artık bekleme
    if (attempt < RETRY_COUNT) {
      await sleep(RETRY_DELAY_MS)
    }
  }

  return null
}
