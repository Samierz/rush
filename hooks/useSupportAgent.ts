// hooks/useSupportAgent.ts — Ana ajan state machine (spec v2)
// 'use client'
//
// Durum makinesi: idle → loading → explained → rebuilding → success | error
//
// AGENTS.md kuralları:
//   - any yasak
//   - console.log yasak — sadece catch'te console.error
//   - API route'lar { error } veya { data } döner
'use client'

import { useState, useCallback } from 'react'
import type {
  SupportAgentState,
  SupportAgentStatus,
  ParseTxApiResponse,
  AnalyzeApiResponse,
  ApiError,
  TxErrorType,
} from '@/types'

// ─── localStorage anahtarı ─────────────────────────────────────────────────

const LS_KEY = 'rush:lastFailedTxHash'

// ─── Başlangıç state ───────────────────────────────────────────────────────

const INITIAL_STATE: SupportAgentState = {
  status: 'idle',
  txHash: null,
  parsedTx: null,
  explanation: null,
  errorType: null,
  errorMessage: null,
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────

function setStatus(status: SupportAgentStatus) {
  return (prev: SupportAgentState): SupportAgentState => ({ ...prev, status })
}

function isApiError(json: unknown): json is ApiError {
  return (
    typeof json === 'object' &&
    json !== null &&
    'error' in json &&
    typeof (json as Record<string, unknown>).error === 'string'
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSupportAgent() {
  const [state, setState] = useState<SupportAgentState>(INITIAL_STATE)

  // ── Pipeline: parse-tx → analyze ────────────────────────────────────────

  const runPipeline = useCallback(async (txHash: string, language: 'tr' | 'en' = 'tr'): Promise<void> => {
    // Adım 1: TX parse
    setState((prev) => ({ ...prev, status: 'loading', txHash, errorMessage: null }))

    let parseJson: unknown
    try {
      const parseRes = await fetch('/api/parse-tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      })
      parseJson = await parseRes.json()
    } catch (err) {
      console.error('[useSupportAgent] parse-tx ağ hatası:', err)
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'İşlem bilgisi alınamadı',
      }))
      return
    }

    if (isApiError(parseJson)) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: parseJson.error,
      }))
      return
    }

    const parseTxData = (parseJson as ParseTxApiResponse).data
    setState((prev) => ({ ...prev, parsedTx: parseTxData }))

    // Adım 2: Claude analiz
    let analyzeJson: unknown
    try {
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorType: parseTxData.errorType,
          logs: parseTxData.logs,
          language,
        }),
      })
      analyzeJson = await analyzeRes.json()
    } catch (err) {
      console.error('[useSupportAgent] analyze ağ hatası:', err)
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: 'Yapay zeka analizi yapılamadı',
      }))
      return
    }

    if (isApiError(analyzeJson)) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: analyzeJson.error,
      }))
      return
    }

    const { explanation } = (analyzeJson as AnalyzeApiResponse).data

    setState((prev) => ({
      ...prev,
      status: 'explained',
      explanation,
      errorType: parseTxData.errorType as TxErrorType,
    }))
  }, [])

  // ── Widget açılınca çağrılır ─────────────────────────────────────────────

  const openWidget = useCallback((language: 'tr' | 'en' = 'tr'): void => {
    let txHash: string | null = null
    try {
      txHash = localStorage.getItem(LS_KEY)
    } catch {
      // SSR veya private browsing — sessizce devam et
    }

    if (!txHash) {
      setState((prev) => ({ ...prev, status: 'idle', txHash: null }))
      return
    }

    void runPipeline(txHash, language)
  }, [runPipeline])

  // ── Düzeltilmiş TX hazırla ───────────────────────────────────────────────

  const prepareFixedTx = useCallback((): void => {
    // Modal içinde imzalama tamamlandıktan sonra çağrılır
    // Gerçek TX gönderimi TxConfirmModal → rebuildTx → wallet.sendTransaction zincirinde
    setState(setStatus('success'))
  }, [])

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback((): void => {
    setState(INITIAL_STATE)
  }, [])

  return {
    state,
    openWidget,
    prepareFixedTx,
    reset,
    // Kolaylık erişimi — widget'ta destructure etmekten kaçınmak için
    explanation: state.explanation,
    errorType: state.errorType,
    txHash: state.txHash,
  }
}
