// RUSH — Merkezi TypeScript Tip Tanımları

/** Desteklenen Solana hata tipleri — route contract */
export type TxErrorType =
  | 'slippage'
  | 'insufficient_funds'
  | 'program_error'
  | 'unknown'

/** Parse edilmiş TX sonucu */
export interface ParsedTxResult {
  /** İstek'ten gelen ham hash (base58 signature) */
  txHash: string
  errorType: TxErrorType
  /** Transaction logMessages dizisi */
  logs: string[]
  /** tx.meta.err değeri, JSON serileştirilebilir */
  rawError: unknown
  slot: number | null
  blockTime: number | null
}

/** Claude Sonnet'ten gelen analiz yanıtı */
export interface AnalyzeResponse {
  explanation: string
}

/** analyze route istek gövdesi */
export interface AnalyzeRequestBody {
  errorType: string
  logs: string[]
}

/** ElevenLabs TTS yanıtı — hook tarafından kullanılır */
export interface VoiceResponse {
  audioUrl: string
}

/** voice route istek gövdesi */
export interface VoiceRequestBody {
  text: string
}

/** Destek ajanının durum makinesi — spec v2 */
export type SupportAgentStatus =
  | 'idle'
  | 'loading'
  | 'explained'
  | 'rebuilding'
  | 'success'
  | 'error'

/** Ana ajan state */
export interface SupportAgentState {
  status: SupportAgentStatus
  /** localStorage'dan okunan son TX hash */
  txHash: string | null
  parsedTx: ParsedTxResult | null
  explanation: string | null
  errorType: TxErrorType | null
  errorMessage: string | null
}

/** API hata yanıtı */
export interface ApiError {
  error: string
}

/** parse-tx API yanıtı */
export interface ParseTxApiResponse {
  data: ParsedTxResult
}

/** parse-tx route istek gövdesi */
export interface ParseTxRequestBody {
  txHash: string
}

/** analyze API yanıtı */
export interface AnalyzeApiResponse {
  data: AnalyzeResponse
}

/** voice API yanıtı */
export interface VoiceApiResponse {
  data: VoiceResponse
}

/** rebuildTx fonksiyonu giriş parametreleri */
export interface RebuildTxInput {
  txHash: string
  errorType: TxErrorType
  /** İmzalayacak cüzdan adresi (Base58 public key) */
  payerPublicKey: string
}

/** Yeniden oluşturulmuş TX — imzaya hazır */
export interface RebuiltTxData {
  /** Wallet adapter'a verilecek serialize edilmiş TX (base64) */
  serializedTx: string
  /** Kullanıcıya gösterilecek açıklama */
  description: string
  /** Uygulanan slippage (bps) — UI'da gösterim için */
  appliedSlippageBps: number
}
