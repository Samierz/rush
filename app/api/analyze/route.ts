// app/api/analyze/route.ts — Claude Sonnet analiz endpoint
//
// POST { errorType: string, logs: string[] }
// → 200 { data: { explanation: string } }
// → 400 { error: string }   — eksik/geçersiz input
// → 500 { error: string }   — Claude API veya beklenmeyen hata

import { NextRequest, NextResponse } from 'next/server'
import { analyzeFailedTx } from '@/lib/gemini'
import type { AnalyzeApiResponse, AnalyzeRequestBody, ApiError } from '@/types'

// ─── Input validator ───────────────────────────────────────────────────────

function validateBody(body: unknown): body is AnalyzeRequestBody {
  if (typeof body !== 'object' || body === null) return false

  const b = body as Record<string, unknown>

  // errorType: zorunlu, string, boş olamaz
  if (typeof b.errorType !== 'string' || b.errorType.trim().length === 0) {
    return false
  }

  // logs: zorunlu, string dizisi (boş dizi kabul edilir)
  if (!Array.isArray(b.logs)) return false
  if (b.logs.some((entry) => typeof entry !== 'string')) return false

  return true
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest
): Promise<NextResponse<AnalyzeApiResponse | ApiError>> {
  // 1. JSON ayrıştırma — parse hatası 400
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
      {
        error:
          '{ errorType: string, logs: string[] } formatında istek gerekli',
      },
      { status: 400 }
    )
  }

  const { errorType, logs } = body

  // 3. Claude Sonnet'e gönder
  let explanation: string
  try {
    explanation = await analyzeFailedTx(errorType, logs)
  } catch (err) {
    console.error('[analyze] Claude API hatası:', err)
    return NextResponse.json(
      { error: 'Yapay zeka analizi başarısız oldu' },
      { status: 500 }
    )
  }

  // 4. Başarılı yanıt
  return NextResponse.json(
    { data: { explanation } },
    { status: 200 }
  )
}
