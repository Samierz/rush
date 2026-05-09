// components/VoicePlayer.tsx — Ses dalgası ve oynatıcı
// AGENTS.md: Ses otomatik başlamasın, kullanıcı onayı al
'use client'

import { useRef, useState } from 'react'

interface VoicePlayerProps {
  audioUrl: string
}

export function VoicePlayer({ audioUrl }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasError, setHasError] = useState(false)

  const togglePlay = async () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
    } catch (err) {
      console.error('[VoicePlayer] Ses çalma hatası:', err)
      setHasError(true)
    }
  }

  if (hasError) {
    return (
      <p className="text-yellow-400 text-xs text-center">
        ⚠️ Ses çalınamadı — yukarıdaki açıklamayı okuyun
      </p>
    )
  }

  return (
    <div
      id="voice-player"
      className="flex items-center gap-3 bg-white/5 rounded-xl p-3"
    >
      <button
        id="voice-play-btn"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Sesi durdur' : 'Sesi çal'}
        className="w-9 h-9 rounded-full bg-purple-600 hover:bg-purple-500
                   flex items-center justify-center flex-shrink-0
                   transition-colors duration-200"
      >
        {isPlaying ? (
          <span className="text-white text-sm">⏸</span>
        ) : (
          <span className="text-white text-sm">▶</span>
        )}
      </button>

      {/* Ses dalgası görseli */}
      <div className="flex items-center gap-0.5 flex-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isPlaying ? 'bg-purple-400' : 'bg-slate-600'
            }`}
            style={{
              height: `${Math.random() * 16 + 4}px`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>

      <span className="text-slate-500 text-xs flex-shrink-0">🔊</span>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
        preload="auto"
      />
    </div>
  )
}

export default VoicePlayer
