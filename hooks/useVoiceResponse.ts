// hooks/useVoiceResponse.ts — ElevenLabs TTS hook
// 'use client' — sadece browser'da çalışır
//
// Kullanım:
//   const { playAudio, isLoading, isPlaying, error } = useVoiceResponse(explanation)
//
// AGENTS.md kuralları:
//   - Ses otomatik başlamasın — playAudio() çağrılınca çalar
//   - ElevenLabs başarısız olursa window.speechSynthesis fallback (tr-TR)
//   - any yasak
//   - console.log yasak — sadece catch'te console.error
'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

// ─── Tipler ────────────────────────────────────────────────────────────────

export interface UseVoiceResponseReturn {
  /** Kullanıcı gestürüyle sesi başlatır */
  playAudio: () => Promise<void>
  /** /api/voice isteği sürüyor mu */
  isLoading: boolean
  /** Ses şu an çalıyor mu */
  isPlaying: boolean
  /** Son hata mesajı, yoksa null */
  error: string | null
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────

/**
 * window.speechSynthesis ile Türkçe ses sentezi (fallback).
 * Browser policy gereği kullanıcı gestürü sonrası çağrılmalıdır.
 */
function speakWithSynthesis(text: string): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'tr-TR'
  utterance.rate = 0.95
  utterance.pitch = 1
  window.speechSynthesis.speak(utterance)
  return utterance
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * @param explanation - Okunacak Türkçe metin (Claude'dan gelen açıklama)
 */
export function useVoiceResponse(explanation: string): UseVoiceResponseReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Blob URL'i ve Audio nesnesini ref'te tut — re-render'da kaybolmasın
  const blobUrlRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Bileşen unmount olunca kaynakları temizle
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  // ─── ElevenLabs yolu ───────────────────────────────────────────────────

  async function fetchAndPlayElevenLabs(): Promise<boolean> {
    const res = await fetch('/api/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: explanation }),
    })

    // Sunucu hata döndürdüyse — JSON body içinde { error }
    if (!res.ok) {
      let serverError = `Ses servisi hatası (${res.status})`
      try {
        const json: unknown = await res.json()
        if (
          typeof json === 'object' &&
          json !== null &&
          'error' in json &&
          typeof (json as Record<string, unknown>).error === 'string'
        ) {
          serverError = (json as Record<string, string>).error
        }
      } catch {
        // JSON parse başarısız — ham durum mesajını kullan
      }
      throw new Error(serverError)
    }

    // audio/mpeg blob al
    const blob = await res.blob()
    if (blob.size === 0) {
      throw new Error('Ses verisi boş geldi')
    }

    // Önceki blob URL'i temizle
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
    }

    const blobUrl = URL.createObjectURL(blob)
    blobUrlRef.current = blobUrl

    const audio = new Audio(blobUrl)
    audioRef.current = audio

    // Olaylar
    audio.addEventListener('play', () => setIsPlaying(true))
    audio.addEventListener('ended', () => setIsPlaying(false))
    audio.addEventListener('pause', () => setIsPlaying(false))
    audio.addEventListener('error', () => {
      setIsPlaying(false)
    })

    await audio.play()
    return true
  }

  // ─── SpeechSynthesis fallback ──────────────────────────────────────────

  function playWithFallback(): void {
    if (!window.speechSynthesis) {
      setError('Ses çalınamıyor — tarayıcınız desteklemiyor')
      return
    }

    window.speechSynthesis.cancel() // önceki varsa durdur

    const utterance = speakWithSynthesis(explanation)
    utteranceRef.current = utterance

    utterance.onstart = () => setIsPlaying(true)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => {
      setIsPlaying(false)
      setError('Tarayıcı ses sentezi başarısız oldu')
    }
  }

  // ─── Ana playAudio fonksiyonu ──────────────────────────────────────────

  const playAudio = useCallback(async (): Promise<void> => {
    if (!explanation.trim()) {
      setError('Çalınacak metin yok')
      return
    }

    // Zaten çalıyorsa durdur (toggle davranışı)
    if (isPlaying) {
      audioRef.current?.pause()
      window.speechSynthesis?.cancel()
      setIsPlaying(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await fetchAndPlayElevenLabs()
    } catch (elevenErr) {
      console.error('[useVoiceResponse] ElevenLabs başarısız, fallback:', elevenErr)

      // ElevenLabs başarısız → speechSynthesis fallback
      try {
        playWithFallback()
      } catch (fallbackErr) {
        console.error('[useVoiceResponse] Fallback hatası:', fallbackErr)
        setError('Ses çalınamıyor')
        setIsPlaying(false)
      }
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explanation, isPlaying])

  return { playAudio, isLoading, isPlaying, error }
}
