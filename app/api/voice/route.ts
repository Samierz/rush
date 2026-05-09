// app/api/voice/route.ts — ElevenLabs TTS endpoint
//
// POST { text: string }
// → 200  Content-Type: audio/mpeg  (raw mp3 blob)
// → 400  { error: string }          — eksik/geçersiz input
// → 500  { error: string }          — ElevenLabs API hatası
//
// AGENTS.md notları:
//   - Voice ID ve API key NEXT_PUBLIC_ prefix'li env'den alınır (config.ts)
//   - Model: eleven_multilingual_v2  (Türkçe için zorunlu)
//   - Format: mp3_44100_128
//   - API key koda gömülmez — config.ts'den import edilir
//   - any yasak, console.log yasak

import { type NextRequest, NextResponse } from 'next/server'
import { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL } from '@/lib/config'
import type { VoiceRequestBody, ApiError } from '@/types'

// ─── Sabitler ─────────────────────────────────────────────────────────────

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1'

// ─── Input validator ───────────────────────────────────────────────────────

function validateBody(body: unknown): body is VoiceRequestBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return typeof b.text === 'string' && b.text.trim().length > 0
}

// ─── Hata JSON yanıtı yardımcısı ──────────────────────────────────────────

function errorResponse(message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ error: message }, { status })
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Konfigürasyon kontrolü — key yoksa erken çık
  if (!ELEVENLABS_API_KEY) {
    console.error('[voice] NEXT_PUBLIC_ELEVENLABS_API_KEY tanımlı değil')
    return errorResponse('Ses servisi yapılandırılmamış', 500)
  }
  if (!ELEVENLABS_VOICE_ID) {
    console.error('[voice] NEXT_PUBLIC_ELEVENLABS_VOICE_ID tanımlı değil')
    return errorResponse('Ses servisi yapılandırılmamış', 500)
  }

  // 2. JSON ayrıştırma
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse('Geçersiz JSON gövdesi', 400)
  }

  // 3. Input validasyonu
  if (!validateBody(body)) {
    return errorResponse('{ text: string } formatında boş olmayan istek gerekli', 400)
  }

  const { text } = body

  // 4. ElevenLabs API çağrısı
  let elevenRes: Response
  try {
    elevenRes = await fetch(
      `${ELEVENLABS_BASE}/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,          // eleven_multilingual_v2
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    )
  } catch (err) {
    console.error('[voice] ElevenLabs ağ hatası:', err)
    return errorResponse('Ses servisine bağlanılamadı', 500)
  }

  // 5. ElevenLabs hata yanıtı
  if (!elevenRes.ok) {
    console.error('[voice] ElevenLabs HTTP hatası:', elevenRes.status)
    return errorResponse(
      `Ses servisi hatası (${elevenRes.status})`,
      500
    )
  }

  // 6. Ham MP3 binary'yi al ve doğrudan stream et
  //    base64'e çevirmek yerine binary blob döndürülür —
  //    hook bunu blob() ile okuyup URL.createObjectURL() uygular.
  let audioBuffer: ArrayBuffer
  try {
    audioBuffer = await elevenRes.arrayBuffer()
  } catch (err) {
    console.error('[voice] Audio buffer okuma hatası:', err)
    return errorResponse('Ses verisi okunamadı', 500)
  }

  // 7. audio/mpeg response — Content-Disposition yok (blob URL yeterli)
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.byteLength),
      // Tarayıcı önbelleğini kapat — her TTS benzersiz olabilir
      'Cache-Control': 'no-store',
    },
  })
}
