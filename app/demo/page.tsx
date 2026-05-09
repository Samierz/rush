// app/demo/page.tsx — RUSH Demo dApp sayfası
// AGENTS.md: Demo flow 1-2 — kullanıcı "Başarısız TX Gönder" basar
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

// SupportWidget'ı SSR'siz yükle (wallet adapter + localStorage bağımlılığı)
const SupportWidget = dynamic(
  () => import('@/components/SupportWidget').then((m) => m.SupportWidget),
  { ssr: false }
)

// ─── localStorage anahtarı — useSupportAgent ile aynı olmalı ─────────────

const LS_KEY = 'rush:lastFailedTxHash'

// ─── TX durum tipleri ────────────────────────────────────────────────────

type TxStatus = 'idle' | 'sending' | 'failed'

// ─── Sahte başarısız TX hash (demo için — gerçek Solana TX eklenecek) ─────

const DEMO_SLIPPAGE_TX_HASH =
  '2AXDGYSE4f2sz7tvMMzyHvUfcoJmxudvdhBcmiUSo6ijwfYmfZYsKRxboQMPh3R4kUhXRVdtSXFXMheka4Rc4P2'
const DEMO_FUNDS_TX_HASH =
  '3L3RY5sT8K4kyEnqhizwaqxLEbcYvpGrGPNEYRwtbCSUtL6YL86jdrvCbohnP5q8VxQ3qzGmt3W3iQJW97rD7m3'
const DEMO_CONGESTION_TX_HASH =
  '4VZdodJgBy6dxMgm45zusmRzrPvKtiumu5YrK9RLPJADpzeJzgebxHsoQD4B58FCFS6aGUufKZka56xFiBGpB94'

// ─── Page ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)

  // Başarısız TX simülasyonu
  async function handleSendFailedTx(type: 'slippage' | 'funds' | 'congestion') {
    if (txStatus === 'sending') return

    setTxStatus('sending')
    setTxHash(null)

    await new Promise<void>((resolve) => setTimeout(resolve, 500))

    let hash = DEMO_SLIPPAGE_TX_HASH
    if (type === 'funds') hash = DEMO_FUNDS_TX_HASH
    if (type === 'congestion') hash = DEMO_CONGESTION_TX_HASH

    setTxHash(hash)
    setTxStatus('failed')

    try {
      localStorage.setItem(LS_KEY, hash)
      window.dispatchEvent(new Event('rush:demo_failed_tx'))
    } catch {
      // Private browsing — sessizce devam et
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center p-8">
      
      {/* ── Üst Menü / Cüzdan ─────────────────────────────────── */}
      <div className="absolute top-6 right-8">
        <WalletMultiButtonDynamic style={{ backgroundColor: '#9333ea', borderRadius: '12px' }} />
      </div>

      {/* ── Başlık ─────────────────────────────────────────────── */}
      <div className="max-w-xl w-full space-y-10">
        <div className="text-center space-y-3">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">RUSH</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Web3 Ses Destek Ajanı
          </h1>
          <p className="text-purple-300 text-base">
            Solana Devnet Demo · Dev3pack Hackathon 2026
          </p>
        </div>

        {/* ── Ana Demo Kartı ──────────────────────────────────── */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-white font-semibold text-lg">
              Başarısız İşlem Demo
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Slippage hatası alacak şekilde hazırlanmış bir Solana işlemi gönderir.
              İşlem başarısız olunca sağ altta RUSH destek butonu aktif hale gelir.
            </p>
          </div>

          {/* Gönder butonları */}
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleSendFailedTx('slippage')}
              disabled={txStatus === 'sending'}
              className="w-full flex items-center justify-center gap-2
                         bg-purple-600 hover:bg-purple-500 active:bg-purple-700
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold py-3 px-6 rounded-xl
                         transition-all duration-200"
            >
              Slippage (Fiyat Kayması) Hatası Gönder
            </button>
            <button
              onClick={() => handleSendFailedTx('funds')}
              disabled={txStatus === 'sending'}
              className="w-full flex items-center justify-center gap-2
                         bg-red-600 hover:bg-red-500 active:bg-red-700
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold py-3 px-6 rounded-xl
                         transition-all duration-200"
            >
              Yetersiz Bakiye Hatası Gönder
            </button>
            <button
              onClick={() => handleSendFailedTx('congestion')}
              disabled={txStatus === 'sending'}
              className="w-full flex items-center justify-center gap-2
                         bg-orange-600 hover:bg-orange-500 active:bg-orange-700
                         disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold py-3 px-6 rounded-xl
                         transition-all duration-200"
            >
              Ağ Yoğunluğu Hatası Gönder
            </button>
          </div>

          {/* TX durum göstergesi */}
          <div
            id="tx-status"
            className="rounded-xl overflow-hidden"
          >
            {txStatus === 'idle' && (
              <p className="text-center text-slate-600 text-sm py-2">
                Henüz işlem gönderilmedi
              </p>
            )}

            {txStatus === 'sending' && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <p className="text-blue-300 text-sm">
                    Devnet&apos;e gönderiliyor...
                  </p>
                </div>
              </div>
            )}

            {txStatus === 'failed' && txHash && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-red-300 text-sm font-medium">
                    İşlem başarısız — Devnet Hatası
                  </p>
                </div>
                <p className="text-slate-600 text-xs font-mono break-all pl-6">
                  {txHash}
                </p>
                <p className="text-slate-500 text-xs pl-6">
                  👉 Sağ alttaki destek butonuna basın
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Demo Akış Bilgisi ────────────────────────────────── */}
        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-5 space-y-3">
          <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider">
            Demo Akışı
          </p>
          <ol className="space-y-2">
            {[
              'Başarısız TX Gönder butonuna bas',
              'Slippage hatalı işlem devnet\'e gönderilir',
              'Sağ alttaki RUSH butonuna bas',
              'Claude Sonnet işlemi analiz eder',
              'ElevenLabs Türkçe sesli açıklama üretir',
              'Düzeltilmiş işlemi imzala ve gönder',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-slate-400 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 text-xs flex items-center justify-center font-mono">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="text-center text-slate-700 text-xs">
          ⚡ Solana Devnet · Gerçek para kullanılmaz
        </p>
      </div>

      {/* ── Float RUSH Widgeti ───────────────────────────────── */}
      <SupportWidget />
    </main>
  )
}
