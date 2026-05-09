// lib/gemini.ts — Google GenAI SDK wrapper
// AGENTS.md kuralları (Gemini'ye uyarlanmış):
//   - max_tokens: 300
//   - Streaming yok (MVP)
//   - API key sadece server-side, config.ts'den alınır
//   - any tipi yasak
//   - console.log yasak — sadece catch'te console.error

import { GoogleGenAI } from '@google/genai'
import { GEMINI_API_KEY, GEMINI_MODEL } from './config'

// ─── Sistem Prompt ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'Kullanıcının Solana işlemi başarısız oldu. Buna teknik olmayan, TÜRKÇE ve tam bir açıklama yap. ' +
  'Şu örneğin dışına çıkma, benzerini yaz: "İşleminiz piyasadaki fiyat değişimi nedeniyle iptal edildi. Şimdi fiyat toleransını artırarak işlemi sizin için yeniden hazırlıyorum." ' +
  'Cümleyi asla yarım bırakma, tam olarak bitir.'

// ─── Client singleton ──────────────────────────────────────────────────────

function buildClient(): GoogleGenAI {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY ortam değişkeni tanımlı değil. ' +
      '.env.local dosyasını kontrol edin.'
    )
  }
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY })
}

let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!_client) {
    _client = buildClient()
  }
  return _client
}

// ─── Ana fonksiyon ─────────────────────────────────────────────────────────

/**
 * Gemini'ye başarısız TX bilgisini gönderir ve Türkçe açıklama alır.
 *
 * @param errorType - TxErrorType string'i ('slippage', 'insufficient_funds', …)
 * @param logs      - Solana TX logMessages dizisi
 * @returns         - Gemini'nin ürettiği Türkçe açıklama metni
 * @throws          - Gemini API hatası veya beklenmeyen yanıt tipi
 */
export async function analyzeFailedTx(
  errorType: string,
  logs: string[]
): Promise<string> {
  const client = getClient()

  const userMessage = `${SYSTEM_PROMPT}\n\nİŞLEM BİLGİLERİ:\nHata Tipi: ${errorType}\nLoglar:\n${logs.join('\n')}\n\nLÜTFEN YUKARIDAKİ KURALLARA GÖRE SADECE TÜRKÇE AÇIKLAMA ÜRET:`

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: userMessage,
    config: {
      temperature: 0.1,
    },
  })

  if (!response.text) {
    throw new Error('Gemini boş yanıt döndürdü')
  }

  return response.text.trim()
}
