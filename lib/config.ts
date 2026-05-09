// lib/config.ts — Tüm ENV değişkenleri buradan import edilir
// AGENTS.md kuralı: ENV değişkenleri doğrudan kullanılmaz

/** Helius devnet RPC URL (public) */
export const HELIUS_RPC_URL: string =
  process.env.NEXT_PUBLIC_HELIUS_RPC ?? ''

/** Gemini API key (sadece server-side) */
export const GEMINI_API_KEY: string =
  process.env.GEMINI_API_KEY ?? ''

/** ElevenLabs API key (public, client-side TTS) */
export const ELEVENLABS_API_KEY: string =
  process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ?? ''

/** ElevenLabs Voice ID */
export const ELEVENLABS_VOICE_ID: string =
  process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'

/** Gemini modeli */
export const GEMINI_MODEL = 'gemini-2.5-flash' as const

/** ElevenLabs model — Türkçe için */
export const ELEVENLABS_MODEL = 'eleven_multilingual_v2' as const

/** Solana devnet TX timeout (ms) */
export const TX_TIMEOUT_MS = 30_000

/** Slippage rebuild değeri (bps) */
export const REBUILD_SLIPPAGE_BPS = 100
