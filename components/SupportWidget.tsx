// components/SupportWidget.tsx — RUSH float destek butonu ve paneli
'use client'

import { useState, useEffect } from 'react'
import { useSupportAgent } from '@/hooks/useSupportAgent'
import { useVoiceResponse } from '@/hooks/useVoiceResponse'
import TxConfirmModal from './TxConfirmModal'

// ─── Hata tipi etiketleri ─────────────────────────────────────────────────

const ERROR_LABELS_TR: Record<string, string> = {
  slippage: 'Slippage Hatası',
  insufficient_funds: 'Yetersiz Bakiye',
  program_error: 'Program Hatası',
  unknown: 'Bilinmeyen Hata',
}

const ERROR_LABELS_EN: Record<string, string> = {
  slippage: 'Slippage Error',
  insufficient_funds: 'Insufficient Funds',
  program_error: 'Program Error',
  unknown: 'Unknown Error',
}

// ─── Alt-bileşen: Spinner ─────────────────────────────────────────────────

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-purple-400 animate-spin" />
      </div>
      <p className="text-slate-400 text-xs font-medium tracking-wide">
        {label}
      </p>
    </div>
  )
}

// ─── Alt-bileşen: Play butonu ─────────────────────────────────────────────

function PlayButton({
  onPlay,
  isLoading,
  isPlaying,
}: {
  onPlay: () => Promise<void>
  isLoading: boolean
  isPlaying: boolean
}) {
  return (
    <button
      id="voice-play-btn"
      onClick={onPlay}
      disabled={isLoading}
      aria-label={isPlaying ? 'Sesi durdur' : 'Açıklamayı sesli dinle'}
      className="flex items-center gap-2 w-full
                 bg-white/5 hover:bg-white/10 disabled:opacity-40
                 border border-white/10 text-slate-300 text-sm font-medium
                 py-2 px-3 rounded-xl transition-all duration-200"
    >
      {/* Waveform / play icon */}
      <span className="flex items-center gap-0.5 shrink-0">
        {isPlaying ? (
          // Animasyonlu dalga
          Array.from({ length: 4 }).map((_, i) => (
            <span
              key={i}
              className="w-0.5 bg-purple-400 rounded-full animate-bounce"
              style={{
                height: `${10 + i * 4}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s',
              }}
            />
          ))
        ) : (
          <svg
            className="w-4 h-4 text-purple-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        )}
      </span>
      <span>
        {isLoading
          ? 'Ses yükleniyor...'
          : isPlaying
          ? 'Duraksatmak için tıkla'
          : 'Sesli Dinle'}
      </span>
    </button>
  )
}

// ─── Ana component ────────────────────────────────────────────────────────

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [language, setLanguage] = useState<'tr' | 'en'>('tr')

  const { state, openWidget, prepareFixedTx, reset, explanation } =
    useSupportAgent()

  const { playAudio, isLoading: voiceLoading, isPlaying, error: voiceError } =
    useVoiceResponse(explanation ?? '')

  // ── Global event dinleyici (Demo için) ──────────────────────────────────
  useEffect(() => {
    const handleNewTx = () => {
      reset()
      setIsOpen(true)
      setTimeout(() => openWidget(language), 50)
    }

    window.addEventListener('rush:demo_failed_tx', handleNewTx)
    return () => window.removeEventListener('rush:demo_failed_tx', handleNewTx)
  }, [openWidget, reset])

  // ── Panel aç/kapat ────────────────────────────────────────────────────

  function handleOpen() {
    setIsOpen(true)
    if (state.status === 'idle') {
      openWidget(language)
    }
  }

  function handleClose() {
    setIsOpen(false)
  }

  // ── TX hazırla ────────────────────────────────────────────────────────

  function handlePrepareFixedTx() {
    setShowConfirmModal(true)
  }

  function handleModalSuccess(_newTxHash: string) {
    setShowConfirmModal(false)
    prepareFixedTx()
    // _newTxHash: ileride Solana Explorer linki için kullanılabilir
  }

  function handleModalCancel() {
    setShowConfirmModal(false)
  }

  // ── Float buton rengi ─────────────────────────────────────────────────

  const isErrorActive = state.txHash !== null && state.status !== 'success'
  const btnBase =
    'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl ' +
    'flex items-center justify-center transition-all duration-300 ease-in-out ' +
    'focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900'

  const btnColor = isErrorActive
    ? 'bg-red-500 hover:bg-red-400 animate-pulse'
    : 'bg-purple-600 hover:bg-purple-500'

  return (
    <>
      {/* ── Float buton ─────────────────────────────────────────── */}
      <button
        id="support-widget-btn"
        aria-label="RUSH destek ajanını aç"
        aria-expanded={isOpen}
        onClick={handleOpen}
        className={`${btnBase} ${btnColor}`}
      >
        {/* Kulaklık SVG */}
        {isErrorActive ? (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        )}
      </button>

      {/* ── Widget paneli ────────────────────────────────────────── */}
      {isOpen && (
        <div
          id="support-widget-panel"
          role="dialog"
          aria-label="RUSH Destek Paneli"
          aria-modal="false"
          className="fixed bottom-24 right-6 z-50 w-[22rem]
                     bg-slate-900/95 backdrop-blur-xl
                     border border-white/10 rounded-2xl shadow-2xl
                     overflow-hidden"
        >
          {/* Panel başlık */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              {/* Logo nokta */}
              <span className="relative flex h-2.5 w-2.5">
                {state.status === 'loading' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    state.status === 'error'
                      ? 'bg-red-500'
                      : state.status === 'success'
                      ? 'bg-green-500'
                      : 'bg-purple-500'
                  }`}
                />
              </span>
              <span className="text-white font-semibold text-sm">
                RUSH {language === 'en' ? 'Support' : 'Destek'}
              </span>
              {state.errorType && (
                <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full">
                  {(language === 'en' ? ERROR_LABELS_EN : ERROR_LABELS_TR)[state.errorType] ?? state.errorType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* TR / EN Toggle */}
              <button
                onClick={() => {
                  const newLang = language === 'tr' ? 'en' : 'tr'
                  setLanguage(newLang)
                  if (state.txHash) {
                    reset()
                    setTimeout(() => openWidget(newLang), 50)
                  }
                }}
                className="text-[10px] font-bold px-2 py-1 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-purple-500/40 hover:bg-purple-500/10 transition-all"
                title={language === 'tr' ? 'Switch to English' : "Türkçe'ye geç"}
              >
                {language === 'tr' ? 'EN' : 'TR'}
              </button>
              <button
                id="close-widget-btn"
                onClick={handleClose}
                aria-label="Paneli kapat"
                className="w-7 h-7 flex items-center justify-center rounded-lg
                           text-slate-500 hover:text-white hover:bg-white/10
                           transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Panel içerik */}
          <div className="px-5 py-4 space-y-4 min-h-[120px]">

            {/* idle — TX yok */}
            {state.status === 'idle' && (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <p className="text-slate-500 text-sm">
                  Başarısız işlem bulunamadı.
                </p>
                <p className="text-slate-600 text-xs">
                  Demo sayfasından bir işlem gönderin.
                </p>
              </div>
            )}

            {/* loading — analiz yapılıyor */}
            {state.status === 'loading' && (
              <Spinner label="İşleminiz analiz ediliyor..." />
            )}

            {/* explained — açıklama hazır */}
            {state.status === 'explained' && state.explanation && (
              <div className="space-y-3">
                {/* Açıklama metni */}
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {state.explanation}
                  </p>
                </div>

                {/* Ses butonu */}
                <PlayButton
                  onPlay={playAudio}
                  isLoading={voiceLoading}
                  isPlaying={isPlaying}
                />

                {/* Ses hatası */}
                {voiceError && (
                  <p className="text-yellow-400 text-xs text-center">
                    ⚠️ {voiceError}
                  </p>
                )}

                {/* Düzeltilmiş TX butonu */}
                <button
                  id="prepare-fixed-tx-btn"
                  onClick={handlePrepareFixedTx}
                  className="w-full bg-purple-600 hover:bg-purple-500
                             active:bg-purple-700 text-white text-sm font-semibold
                             py-2.5 px-4 rounded-xl transition-all duration-200
                             flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Düzeltilmiş İşlemi Hazırla
                </button>
              </div>
            )}

            {/* rebuilding */}
            {state.status === 'rebuilding' && (
              <Spinner label="Düzeltilmiş işlem hazırlanıyor..." />
            )}

            {/* success */}
            {state.status === 'success' && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-green-400 font-semibold text-sm">
                  İşlem Başarıyla Gönderildi!
                </p>
                <button
                  id="reset-widget-btn"
                  onClick={reset}
                  className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}

            {/* error */}
            {state.status === 'error' && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm">
                  {state.errorMessage ?? 'Beklenmeyen bir hata oluştu'}
                </p>
                <button
                  id="retry-widget-btn"
                  onClick={() => openWidget(language)}
                  className="text-purple-400 hover:text-purple-300 text-xs
                             underline underline-offset-2 transition-colors"
                >
                  Tekrar Dene
                </button>
              </div>
            )}
          </div>

          {/* Panel alt footer */}
          <div className="px-5 py-2.5 border-t border-white/5 flex items-center justify-between">
            <span className="text-slate-600 text-[10px] tracking-wide uppercase">
              RUSH · Solana Devnet
            </span>
            {state.txHash && (
              <span className="text-slate-700 text-[10px] font-mono truncate max-w-[120px]">
                {state.txHash.slice(0, 8)}…
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── TX onay modalı ───────────────────────────────────────── */}
      {showConfirmModal && state.txHash && state.errorType && (
        <TxConfirmModal
          txHash={state.txHash}
          errorType={state.errorType}
          onSuccess={handleModalSuccess}
          onCancel={handleModalCancel}
        />
      )}
    </>
  )
}

export default SupportWidget
