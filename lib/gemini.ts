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
  'Kullanıcının Solana işlemi başarısız oldu. Buna teknik olmayan, TÜRKÇE ve 2 cümlelik tam bir açıklama yap. ' +
  'Gelen hataya göre şu mantığı kullan:\n' +
  '- Eğer hata Slippage ise: "İşleminiz fiyat değişimi nedeniyle iptal edildi. Şimdi fiyat toleransını artırarak işlemi sizin için yeniden hazırlıyorum." de.\n' +
  '- Eğer hata Insufficient Funds (Yetersiz Bakiye) ise: "Cüzdanınızdaki bakiye yetersiz olduğu için işlem gerçekleşmedi. İşlem miktarını bakiyenize uygun olarak düşürüp işlemi yeniden hazırlıyorum." de.\n' +
  '- Eğer hata Congestion/Blockhash ise: "Solana ağı şu an çok yoğun olduğu için işleminiz zaman aşımına uğradı. İşleminize ufak bir öncelik ücreti ekleyerek yeniden hazırlıyorum." de.\n' +
  '- Eğer hata Dust Error (miktar çok küçük) ise: "Göndermek istediğiniz miktar Solana ağ ücretlerini bile karşılayamayacak kadar küçük. Minimum işlem tutarını sağlayarak işlemi düzeltiyor ve yeniden gönderiyorum." de.\n' +
  '- Eğer hata Program Error (havuz/sözleşme hatası) ise: "Seçtiğiniz token için likidite havuzu şu an kilitli veya hizmet dışı. Lütfen başka bir token seçin ya da kısa süre sonra tekrar deneyin." de.\n' +
  '- Eğer hata MEV Attack ise: "İşleminiz bir MEV botu tarafından fiyat manipülasyonuna uğradı. Paranızı korumak için işlemi iptal ettim, şimdi MEV-korumalı özel bir kanal üzerinden işlemi güvenle yeniden hazırlıyorum." de.\n' +
  'Cümleyi asla yarım bırakma, tam olarak bitir ve teknik kelime kullanma.'

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
