// components/TxConfirmModal.tsx — TX yeniden inşa + imza modal
// AGENTS.md: Wallet imzasını sadece client-side al — backend'e asla gönderme
'use client'

import { useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Transaction } from '@solana/web3.js'
import { rebuildTx } from '@/lib/rebuildTx'
import { getConnection } from '@/lib/solana'
import type { TxErrorType, RebuildTxInput } from '@/types'

// ─── Tipler ───────────────────────────────────────────────────────────────

type ModalStatus = 'confirm' | 'building' | 'signing' | 'success' | 'error'

interface TxConfirmModalProps {
  txHash: string
  errorType: TxErrorType
  onSuccess: (newTxHash: string) => void
  onCancel: () => void
}

// ─── Hata tipi etiketleri ─────────────────────────────────────────────────

const ERROR_LABELS: Record<TxErrorType, string> = {
  slippage: 'Slippage Hatası',
  insufficient_funds: 'Yetersiz Bakiye',
  program_error: 'Program Hatası',
  congestion: 'Ağ Yoğunluğu',
  unknown: 'Bilinmeyen Hata',
}

const FIX_DESCRIPTIONS: Record<TxErrorType, string[]> = {
  slippage: [
    'Slippage toleransı %1 (100 bps) olarak ayarlandı',
    'Taze blockhash ile yeniden oluşturuldu',
    'Solana Devnet üzerinde gönderilecek',
  ],
  insufficient_funds: [
    'İşlem miktarı güncellendi',
    'Taze blockhash ile yeniden oluşturuldu',
    'Solana Devnet üzerinde gönderilecek',
  ],
  program_error: [
    'Program parametreleri sıfırlandı',
    'Taze blockhash ile yeniden oluşturuldu',
    'Solana Devnet üzerinde gönderilecek',
  ],
  congestion: [
    'Öncelik ücreti (Priority Fee) eklendi',
    'Taze blockhash ile yeniden oluşturuldu',
    'Solana Devnet üzerinde gönderilecek',
  ],
  unknown: [
    'Taze blockhash ile yeniden oluşturuldu',
    'Solana Devnet üzerinde gönderilecek',
  ],
}

// ─── Alt-bileşen: Durum ikonu ─────────────────────────────────────────────

function StatusIcon({ status }: { status: ModalStatus }) {
  if (status === 'building' || status === 'signing') {
    return (
      <div className="relative w-14 h-14 mx-auto">
        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-t-purple-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
        <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
        <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
    )
  }

  // confirm state
  return (
    <div className="w-14 h-14 mx-auto rounded-full bg-purple-500/20 flex items-center justify-center">
      <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    </div>
  )
}

// ─── Ana Modal ────────────────────────────────────────────────────────────

export function TxConfirmModal({
  txHash,
  errorType,
  onSuccess,
  onCancel,
}: TxConfirmModalProps) {
  const [status, setStatus] = useState<ModalStatus>('confirm')
  const [statusLabel, setStatusLabel] = useState('')
  const [newTxHash, setNewTxHash] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { publicKey, sendTransaction } = useWallet()

  // ── İmzala ve gönder ────────────────────────────────────────────────────

  const handleSignAndSend = useCallback(async () => {
    if (!publicKey) {
      setStatus('error')
      setErrorMessage('Cüzdan bağlı değil — lütfen bağlayın ve tekrar deneyin')
      return
    }

    // Adım 1: TX yeniden inşa et
    setStatus('building')
    setStatusLabel('Düzeltilmiş işlem hazırlanıyor...')

    const input: RebuildTxInput = {
      txHash,
      errorType,
      payerPublicKey: publicKey.toBase58(),
    }

    let serializedTx: string
    try {
      const rebuilt = await rebuildTx(input)
      serializedTx = rebuilt.serializedTx
    } catch (err) {
      console.error('[TxConfirmModal] rebuildTx hatası:', err)
      setStatus('error')
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'TX yeniden oluşturulamadı'
      )
      return
    }

    // Adım 2: Deserialize + wallet ile imzala ve gönder
    setStatus('signing')
    setStatusLabel('Cüzdan onayı bekleniyor...')

    let txSignature: string
    try {
      const txBuffer = Buffer.from(serializedTx, 'base64')
      const transaction = Transaction.from(txBuffer)

      const connection = getConnection()

      // AGENTS.md: Wallet imzasını sadece client-side al
      txSignature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      })
    } catch (err) {
      console.error('[TxConfirmModal] sendTransaction hatası:', err)
      setStatus('error')
      // Kullanıcı reddettiyse özel mesaj
      const msg =
        err instanceof Error ? err.message : 'İmzalama başarısız oldu'
      setErrorMessage(
        msg.toLowerCase().includes('user rejected') ||
        msg.toLowerCase().includes('cancelled')
          ? 'İşlem iptal edildi'
          : msg
      )
      return
    }

    // Adım 3: Başarı
    setNewTxHash(txSignature)
    setStatus('success')
    onSuccess(txSignature)
  }, [publicKey, sendTransaction, txHash, errorType, onSuccess])

  // ── Render ───────────────────────────────────────────────────────────────

  const isProcessing = status === 'building' || status === 'signing'

  return (
    <div
      id="tx-confirm-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center
                 bg-black/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-confirm-title"
      // ESC ile kapat (işlem sırasında değil)
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !isProcessing) onCancel()
      }}
    >
      <div
        id="tx-confirm-modal"
        className="bg-slate-900 border border-white/10 rounded-2xl
                   shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
      >
        {/* Renkli üst şerit */}
        <div
          className={`h-1 w-full ${
            status === 'success'
              ? 'bg-green-500'
              : status === 'error'
              ? 'bg-red-500'
              : 'bg-purple-600'
          }`}
        />

        <div className="p-6 space-y-5">
          {/* İkon + başlık */}
          <div className="text-center space-y-3">
            <StatusIcon status={status} />

            <div>
              <h2
                id="tx-confirm-title"
                className="text-white font-bold text-lg"
              >
                {status === 'confirm' && 'İşlemi İmzala'}
                {status === 'building' && 'Hazırlanıyor'}
                {status === 'signing' && 'İmzalanıyor'}
                {status === 'success' && 'İşlem Gönderildi!'}
                {status === 'error' && 'İşlem Başarısız'}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {status === 'confirm' &&
                  `${ERROR_LABELS[errorType]} düzeltildi`}
                {isProcessing && statusLabel}
                {status === 'success' && 'Devnet\'te onaylanıyor'}
                {status === 'error' && 'Aşağıdaki hatayı inceleyin'}
              </p>
            </div>
          </div>

          {/* confirm state: detaylar */}
          {status === 'confirm' && (
            <div className="bg-white/5 border border-white/8 rounded-xl p-4 space-y-2.5">
              {/* Hata tipi rozeti */}
              <div className="flex items-center gap-2 pb-1 border-b border-white/5">
                <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                  {ERROR_LABELS[errorType]}
                </span>
                <span className="text-slate-600 text-xs">tespit edildi → düzeltildi</span>
              </div>

              {/* Yapılan düzeltmeler */}
              {FIX_DESCRIPTIONS[errorType].map((fix, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300 text-xs">{fix}</span>
                </div>
              ))}

              {/* TX hash */}
              <div className="pt-1 border-t border-white/5">
                <p className="text-slate-600 text-[10px] font-mono truncate">
                  Kaynak: {txHash.slice(0, 16)}…{txHash.slice(-8)}
                </p>
              </div>
            </div>
          )}

          {/* success state: yeni TX hash */}
          {status === 'success' && newTxHash && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2">
              <p className="text-green-400 text-xs font-semibold">Yeni TX Hash</p>
              <p className="text-slate-300 text-[11px] font-mono break-all">
                {newTxHash}
              </p>
              <a
                href={`https://explorer.solana.com/tx/${newTxHash}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-purple-400
                           hover:text-purple-300 text-xs transition-colors"
              >
                Solana Explorer&apos;da Gör
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          )}

          {/* error state: hata mesajı */}
          {status === 'error' && errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-300 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Wallet bağlı değil uyarısı */}
          {status === 'confirm' && !publicKey && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              <p className="text-yellow-300 text-xs text-center">
                ⚠️ Devam etmek için cüzdanınızı bağlayın
              </p>
            </div>
          )}

          {/* Aksiyon butonları */}
          <div className="flex gap-3">
            {/* İptal — işlem sırasında gizlenir */}
            {!isProcessing && status !== 'success' && (
              <button
                id="tx-cancel-btn"
                onClick={onCancel}
                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300
                           font-semibold py-2.5 px-4 rounded-xl
                           transition-all duration-200 border border-white/10 text-sm"
              >
                {status === 'error' ? 'Kapat' : 'İptal'}
              </button>
            )}

            {/* Ana aksiyon butonu */}
            {status === 'confirm' && (
              <button
                id="tx-confirm-btn"
                onClick={handleSignAndSend}
                disabled={!publicKey}
                className="flex-1 bg-purple-600 hover:bg-purple-500
                           disabled:opacity-40 disabled:cursor-not-allowed
                           text-white font-semibold py-2.5 px-4 rounded-xl
                           transition-all duration-200 text-sm
                           flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
                İmzala ve Gönder
              </button>
            )}

            {/* İşlem sırasında: yükleme göstergesi */}
            {isProcessing && (
              <div className="flex-1 flex items-center justify-center gap-2
                              bg-purple-600/30 border border-purple-500/30
                              rounded-xl py-2.5 px-4">
                <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-purple-300 text-sm font-medium">
                  {status === 'building' ? 'Hazırlanıyor...' : 'İmzalanıyor...'}
                </span>
              </div>
            )}

            {/* Başarı: kapat butonu */}
            {status === 'success' && (
              <button
                id="tx-success-close-btn"
                onClick={onCancel}
                className="flex-1 bg-green-600 hover:bg-green-500
                           text-white font-semibold py-2.5 px-4 rounded-xl
                           transition-all duration-200 text-sm"
              >
                Tamam
              </button>
            )}

            {/* Hata: tekrar dene */}
            {status === 'error' && (
              <button
                id="tx-retry-btn"
                onClick={() => {
                  setStatus('confirm')
                  setErrorMessage(null)
                }}
                className="flex-1 bg-purple-600 hover:bg-purple-500
                           text-white font-semibold py-2.5 px-4 rounded-xl
                           transition-all duration-200 text-sm"
              >
                Tekrar Dene
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TxConfirmModal
