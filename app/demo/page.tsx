// app/demo/page.tsx — RUSH Demo dApp sayfası (Gerçekçi DEX Arayüzü)
'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

const SupportWidget = dynamic(
  () => import('@/components/SupportWidget').then((m) => m.SupportWidget),
  { ssr: false }
)

// ─── localStorage anahtarı — useSupportAgent ile aynı olmalı ─────────────
const LS_KEY = 'rush:lastFailedTxHash'

// ─── Demo TX Hash'leri ─────────────────────────────────────────────────────
const DEMO_SLIPPAGE_TX_HASH =
  '2AXDGYSE4f2sz7tvMMzyHvUfcoJmxudvdhBcmiUSo6ijwfYmfZYsKRxboQMPh3R4kUhXRVdtSXFXMheka4Rc4P2'
const DEMO_FUNDS_TX_HASH =
  '3L3RY5sT8K4kyEnqhizwaqxLEbcYvpGrGPNEYRwtbCSUtL6YL86jdrvCbohnP5q8VxQ3qzGmt3W3iQJW97rD7m3'
const DEMO_CONGESTION_TX_HASH =
  '4VZdodJgBy6dxMgm45zusmRzrPvKtiumu5YrK9RLPJADpzeJzgebxHsoQD4B58FCFS6aGUufKZka56xFiBGpB94'
const DEMO_DUST_TX_HASH =
  '5DUSTm3X9vPqRzLwaNknhizwaqxLEbcZxpGrGPMEYcwtbCSUtL6YA86jdrvCbohnP5q8VxQ3qzGmt3W3iXJW97'
const DEMO_PROGRAM_TX_HASH =
  '6PROGdJgBy7dxMgm45zusmRzrPvKtiumu5YrK9RLPJADpzeJzgebxHsoQD4B58FCFS6aGUufKZka56xFiBGpC11'
const DEMO_MEV_TX_HASH =
  '7MEVdJgBy8dxMgm45zusmRzrPvKtiumu5YrK9RLPJADpzeJzgebxHsoQD4B58FCFS6aGUufKZka56xFiBGP999'

type TxStatus = 'idle' | 'sending' | 'failed' | 'success'

export default function DemoPage() {
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [payAmount, setPayAmount] = useState<string>('1')
  const [slippage, setSlippage] = useState<number>(0.5)
  const [priorityFee, setPriorityFee] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<string>('Takas')
  const [receiveToken, setReceiveToken] = useState<'USDC' | 'BONK' | 'PEPE'>('USDC')
  const [showTokenMenu, setShowTokenMenu] = useState<boolean>(false)
  const USER_BALANCE = 2.45 // Demo bakiye

  // ─── Gizli Hata Simülasyonu ────────────────────────────────────────────────
  // 1. Kural: Miktar >= Bakiye → Yetersiz Bakiye
  // 2. Kural: Slippage === 0.1  → Slippage Hatası
  // 3. Kural: Priority Fee kapalı → Ağ Yoğunluğu
  async function handleSwap() {
    if (txStatus === 'sending') return
    setTxStatus('sending')
    await new Promise<void>((resolve) => setTimeout(resolve, 900))

    const amountNum = parseFloat(payAmount) || 0
    let hash: string | null = DEMO_SLIPPAGE_TX_HASH

    if (receiveToken === 'PEPE' && slippage >= 5) {
      // MEV Bot Attack: PEPE + Yüksek Slippage
      hash = DEMO_MEV_TX_HASH
    } else if (receiveToken === 'BONK' || receiveToken === 'PEPE') {
      // Program Error: Havuz hatası (PEPE tek başına seçilirse de hata versin)
      hash = DEMO_PROGRAM_TX_HASH
    } else if (amountNum > 0 && amountNum < 0.01) {
      // Dust Error: çok küçük miktar
      hash = DEMO_DUST_TX_HASH
    } else if (amountNum >= USER_BALANCE) {
      hash = DEMO_FUNDS_TX_HASH
    } else if (slippage === 0.1) {
      hash = DEMO_SLIPPAGE_TX_HASH
    } else if (!priorityFee) {
      hash = DEMO_CONGESTION_TX_HASH
    } else {
      // Hiçbir hata kuralına uymuyorsa BAŞARILI say
      hash = null
    }

    if (hash) {
      setTxStatus('failed')
      try {
        localStorage.setItem(LS_KEY, hash)
        window.dispatchEvent(new Event('rush:demo_failed_tx'))
      } catch {
        // Private browsing
      }
    } else {
      setTxStatus('success')
    }

    setTimeout(() => setTxStatus('idle'), 4000)
  }

  const receiveAmount = payAmount ? (parseFloat(payAmount) * 145.32).toFixed(2) : '0.00'

  return (
    <div className="min-h-screen bg-[#0d0f1a] flex flex-col relative overflow-hidden">

      {/* ── Arka Plan Parlamaları ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-purple-700/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-700/10 rounded-full blur-[120px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SolSwap</span>
          <span className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-0.5 rounded-full">Devnet</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
            <span>Devnet Bağlı</span>
          </div>
          <WalletMultiButtonDynamic
            style={{
              backgroundColor: 'rgba(147,51,234,0.15)',
              border: '1px solid rgba(147,51,234,0.3)',
              borderRadius: '12px',
              color: '#c084fc',
              fontSize: '14px',
              fontWeight: 600,
              padding: '8px 16px',
              height: 'auto',
            }}
          />
        </div>
      </nav>

      {/* ── Ana İçerik ── */}
      <main className="relative z-10 flex-1 flex items-start justify-center pt-12 pb-20 px-4">
        <div className="w-full max-w-[480px] flex flex-col gap-4">

          {/* Sekme Çubuğu */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
            {['Takas', 'Limit Emir', 'DCA'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ── SWAP Kartı ── */}
          {activeTab === 'Takas' ? (
          <div className="bg-[#13162a]/80 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl overflow-hidden">

            {/* Kart Başlığı */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <span className="text-white font-semibold">Takas Et</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                  1 SOL ≈ 145.32 USDC
                </span>
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2">

              {/* PAY INPUT */}
              <div className="bg-[#0d0f1a] rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-colors focus-within:border-purple-500/50">
                <div className="flex justify-between text-xs text-slate-500 mb-3">
                  <span>Ödeyeceksin</span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    Bakiye: {USER_BALANCE} SOL
                    <button
                      className="text-purple-400 hover:text-purple-300 font-medium ml-1"
                      onClick={() => setPayAmount(USER_BALANCE.toString())}
                    >
                      MAX
                    </button>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="flex-1 bg-transparent text-3xl font-semibold text-white focus:outline-none placeholder-slate-600 min-w-0"
                    placeholder="0"
                  />
                  <div className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 transition-colors rounded-xl py-2 px-3 cursor-pointer shrink-0 border border-white/5">
                    {/* SOL logo */}
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M4.5 16.5h15a.75.75 0 010 1.5h-15a.75.75 0 010-1.5zm0-4.5h15a.75.75 0 010 1.5h-15A.75.75 0 014.5 12zm0-4.5h15a.75.75 0 010 1.5h-15a.75.75 0 010-1.5z"/>
                      </svg>
                    </div>
                    <span className="text-white font-semibold text-sm">SOL</span>
                    <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  ≈ ${(parseFloat(payAmount || '0') * 145.32).toFixed(2)} USD
                </div>
              </div>

              {/* RECEIVE INPUT */}
              <div className="bg-[#0d0f1a] rounded-xl p-4 border border-white/5 mt-1">
                <div className="flex justify-between text-xs text-slate-500 mb-3">
                  <span>Alacaksın (Tahmini)</span>
                  {receiveToken === 'BONK' && (
                    <span className="text-orange-400 font-medium flex items-center gap-1">
                      ⚠ Havuz riski yüksek
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    readOnly
                    value={receiveToken === 'USDC' ? receiveAmount : (parseFloat(payAmount || '0') * (receiveToken === 'BONK' ? 42150000 : 185000000)).toLocaleString()}
                    className="flex-1 bg-transparent text-3xl font-semibold text-slate-300 focus:outline-none min-w-0"
                  />
                  {/* Token Seçici Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setShowTokenMenu(!showTokenMenu)}
                      className={`flex items-center gap-2 rounded-xl py-2 px-3 border transition-colors ${
                        receiveToken === 'BONK'
                          ? 'bg-orange-500/15 border-orange-500/30 hover:bg-orange-500/25'
                          : 'bg-slate-800/80 border-white/5 hover:bg-slate-700/80'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        receiveToken === 'USDC' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
                      }`}>
                        {receiveToken === 'USDC' ? '$' : '🐶'}
                      </div>
                      <span className="text-white font-semibold text-sm">{receiveToken}</span>
                      <svg className={`w-3 h-3 text-slate-400 transition-transform ${showTokenMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>
                    {/* Dropdown Menü */}
                    {showTokenMenu && (
                      <div className="absolute right-0 top-11 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden w-44">
                        {[
                          { symbol: 'USDC', label: 'USD Coin', color: 'bg-blue-500', emoji: '$', risk: false },
                          { symbol: 'BONK', label: 'Bonk', color: 'bg-orange-500', emoji: '🐶', risk: true },
                          { symbol: 'PEPE', label: 'Pepe', color: 'bg-green-600', emoji: '🐸', risk: true },
                        ].map((token) => (
                          <button
                            key={token.symbol}
                            onClick={() => {
                              setReceiveToken(token.symbol as 'USDC' | 'BONK' | 'PEPE')
                              setShowTokenMenu(false)
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/5 transition-colors ${receiveToken === token.symbol ? 'bg-white/5' : ''}`}
                          >
                            <div className={`w-7 h-7 rounded-full ${token.color} flex items-center justify-center text-[10px] text-white shrink-0`}>
                              {token.emoji}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">{token.symbol}</p>
                              <p className="text-slate-500 text-xs">{token.label}</p>
                            </div>
                            {token.risk && <span className="ml-auto text-orange-400 text-xs">⚠</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  {receiveToken === 'USDC' 
                    ? `≈ $${receiveAmount} USD` 
                    : `≈ ${(parseFloat(payAmount || '0') * (receiveToken === 'BONK' ? 42150000 : 185000000)).toLocaleString()} ${receiveToken}`}
                </div>
              </div>


              {/* ── AYARLAR (Gizli Demo Tetikleyicileri) ── */}
              <div className="bg-[#0d0f1a]/60 rounded-xl px-4 py-3 border border-white/5 space-y-3">

                {/* Slippage */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-sm">Fiyat Kayması</span>
                    <div className="relative group">
                      <svg className="w-3.5 h-3.5 text-slate-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 w-52 hidden group-hover:block z-20 border border-white/10 shadow-xl">
                        Kabul ettiğiniz maksimum fiyat değişimi. Düşük değer = daha hassas, daha kolay hata.
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[0.1, 0.5, 1.0, 5.0].map((val) => (
                      <button
                        key={val}
                        onClick={() => setSlippage(val)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all duration-150 ${
                          slippage === val
                            ? val >= 5 ? 'bg-red-500/25 text-red-300 border border-red-500/40' : 'bg-purple-500/25 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/20'
                            : 'bg-slate-800 text-slate-400 border border-transparent hover:bg-slate-700 hover:text-slate-300'
                        }`}
                      >
                        %{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Fee */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-sm">Öncelik Ücreti</span>
                    <div className="relative group">
                      <svg className="w-3.5 h-3.5 text-slate-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 w-52 hidden group-hover:block z-20 border border-white/10 shadow-xl">
                        Ağ yoğunluğunda işleminizi öne almak için ek ücret. Kapalıysa işlem gecikebilir veya başarısız olabilir.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${priorityFee ? 'text-green-400' : 'text-slate-500'}`}>
                      {priorityFee ? 'Açık' : 'Kapalı'}
                    </span>
                    <button
                      onClick={() => setPriorityFee(!priorityFee)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 focus:outline-none ${
                        priorityFee ? 'bg-purple-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200"
                        style={{ transform: priorityFee ? 'translateX(18px)' : 'translateX(4px)' }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Rota bilgisi */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>En iyi rota: Jupiter → Raydium</span>
                <span className="text-green-500">%0.3 tasarruf</span>
              </div>

              {/* ── SWAP BUTONU ── */}
              <button
                id="swap-btn"
                onClick={handleSwap}
                disabled={txStatus === 'sending' || txStatus === 'success' || !payAmount || parseFloat(payAmount) <= 0}
                className={`w-full font-bold py-4 rounded-xl text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  txStatus === 'failed'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : txStatus === 'success'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98]'
                }`}
              >
                {txStatus === 'sending' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>İşlem Gönderiliyor...</span>
                  </>
                ) : txStatus === 'failed' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    <span>İşlem Başarısız — RUSH&apos;a Danış</span>
                  </>
                ) : txStatus === 'success' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Takas Başarılı!</span>
                  </>
                ) : (
                  'Takas Et'
                )}
              </button>

              {/* Başarısız uyarı */}
              {txStatus === 'failed' && (
                <div className="flex items-center gap-2 text-xs text-slate-500 px-1 animate-pulse">
                  <svg className="w-4 h-4 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                  </svg>
                  Sağ alttaki RUSH butonuna tıklayarak hatanızı sesli analiz ettirin
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="bg-[#13162a]/80 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">{activeTab} Özelliği</h3>
              <p className="text-sm text-slate-400">
                Bu özellik şu anda geliştirme aşamasında. Çok yakında SolSwap üzerinde aktif olacak!
              </p>
            </div>
          )}

          {/* Alt Bilgi */}
          <p className="text-center text-slate-600 text-xs">
            Bu arayüz RUSH AI Destek Ajanı demo ortamıdır · Gerçek işlem gerçekleştirilmez
          </p>
        </div>
      </main>

      <SupportWidget />
    </div>
  )
}
