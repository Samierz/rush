// lib/txParser.ts — Solana TX log hata tespiti
import type { ParsedTransactionWithMeta } from '@solana/web3.js'
import type { ParsedTxResult, TxErrorType } from '@/types'

// ─── Hata kalıpları (öncelik sırasıyla) ───────────────────────────────────
//
// AGENTS.md'deki 4 hata tipi + route contract'taki kısa string'ler:
//   "SlippageToleranceExceeded"       → "slippage"
//   "InsufficientFunds"               → "insufficient_funds"
//   "custom program error: 0x1771"    → "slippage"  (Raydium slippage kodu)
//   "AnchorError"                     → "program_error"
//   diğer                             → "unknown"

interface ErrorPattern {
  /** Log satırlarında aranacak alt dize */
  match: string
  type: TxErrorType
}

const ERROR_PATTERNS: ErrorPattern[] = [
  { match: 'SlippageToleranceExceeded', type: 'slippage' },
  { match: 'custom program error: 0x1771', type: 'slippage' },
  { match: 'InsufficientFunds', type: 'insufficient_funds' },
  { match: 'AnchorError', type: 'program_error' },
]

// ─── Yardımcılar ──────────────────────────────────────────────────────────

/**
 * Log satırlarını tarar ve ilk eşleşen hata tipini döner.
 * Sıralama önemlidir: 0x1771 Raydium slippage, SlippageToleranceExceeded'dan
 * önce gelirse yanlış etiket alabilir — her ikisi de "slippage" olduğundan
 * burada önemli değil, ama gelecekte ayrı tipler eklenmesi durumunda dikkat.
 */
function detectErrorType(logs: string[]): TxErrorType {
  // Tek bir join ile O(n*m) yerine O(n) geçiş
  const joined = logs.join('\n')
  for (const { match, type } of ERROR_PATTERNS) {
    if (joined.includes(match)) return type
  }
  return 'unknown'
}

// ─── Ana parse fonksiyonu ─────────────────────────────────────────────────

/**
 * Başarısız (veya başarılı) bir TX'i parse eder ve `ParsedTxResult` döner.
 *
 * @param txHash   - Orijinal istek'ten gelen hash
 * @param tx       - Solana RPC'den alınan ham TX nesnesi
 */
export function parseTx(
  txHash: string,
  tx: ParsedTransactionWithMeta
): ParsedTxResult {
  const logs: string[] = tx.meta?.logMessages ?? []

  // TX başarısız mıydı?
  const hasFailed = tx.meta?.err !== null && tx.meta?.err !== undefined

  const errorType: TxErrorType = hasFailed
    ? detectErrorType(logs)
    : 'unknown'

  return {
    txHash,
    errorType,
    logs,
    rawError: tx.meta?.err ?? null,
    slot: tx.slot ?? null,
    blockTime: tx.blockTime ?? null,
  }
}
