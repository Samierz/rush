// app/api/parse-tx/route.ts — Solana TX log parser endpoint
//
// POST { txHash: string }
// → 200 { data: ParsedTxResult }
// → 400 { error: string }   — eksik/geçersiz input
// → 500 { error: string }   — beklenmeyen hata
//
// Demo modu: TX devnet'te bulunamazsa mock slippage hatası döner.
// Gerçek TX bulunursa her zaman gerçek loglar parse edilir.

import { NextRequest, NextResponse } from 'next/server'
import { fetchTransactionWithRetry } from '@/lib/solana'
import { parseTx } from '@/lib/txParser'
import type { ParseTxApiResponse, ParseTxRequestBody, ApiError, ParsedTxResult } from '@/types'

// ─── Input validator ───────────────────────────────────────────────────────

function validateBody(body: unknown): body is ParseTxRequestBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'txHash' in body &&
    typeof (body as Record<string, unknown>).txHash === 'string' &&
    (body as ParseTxRequestBody).txHash.trim().length > 0
  )
}

// ─── Demo mock — TX devnet'te yoksa kullanılır ────────────────────────────
//
// Hackathon demosunda sahte TX hash gönderildiğinde pipeline'ın
// Claude → ElevenLabs aşamalarına geçebilmesi için mock result döner.

function buildDemoMockResult(txHash: string): ParsedTxResult {
  return {
    txHash,
    errorType: 'slippage',
    logs: [
      'Program log: Instruction: Swap',
      'Program log: SlippageToleranceExceeded',
      'Program log: Error: custom program error: 0x1771',
      'Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]',
      'Program log: AnchorError caused by account: token_program.',
      'Program failed to complete: SlippageToleranceExceeded',
    ],
    rawError: { InstructionError: [0, { Custom: 6001 }] },
    slot: null,
    blockTime: null,
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest
): Promise<NextResponse<ParseTxApiResponse | ApiError>> {
  // 1. Gövdeyi ayrıştır
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Geçersiz JSON gövdesi' },
      { status: 400 }
    )
  }

  // 2. Input validasyonu
  if (!validateBody(body)) {
    return NextResponse.json(
      { error: '{ txHash: string } formatında istek gerekli' },
      { status: 400 }
    )
  }

  const { txHash } = body

  // 3. Devnet'ten TX'i çek — 3 deneme, 3 saniye aralıkla
  let tx: Awaited<ReturnType<typeof fetchTransactionWithRetry>>
  try {
    tx = await fetchTransactionWithRetry(txHash)
  } catch (err) {
    console.error('[parse-tx] RPC bağlantı hatası:', err)
    return NextResponse.json(
      { error: 'Solana RPC bağlantısı başarısız' },
      { status: 500 }
    )
  }

  // 4a. TX devnet'te bulunamadı → Demo mock response
  //     Gerçek bir hackathon demosu için yeterli; prod'da kaldırılır.
  if (tx === null) {
    const mockResult = buildDemoMockResult(txHash)
    return NextResponse.json({ data: mockResult }, { status: 200 })
  }

  // 4b. Gerçek TX bulundu — logları parse et
  let parsed: ReturnType<typeof parseTx>
  try {
    parsed = parseTx(txHash, tx)
  } catch (err) {
    console.error('[parse-tx] parseTx hatası:', err)
    return NextResponse.json(
      { error: 'TX parse edilirken beklenmeyen hata oluştu' },
      { status: 500 }
    )
  }

  // 5. Başarılı yanıt
  return NextResponse.json({ data: parsed }, { status: 200 })
}
