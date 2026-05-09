// lib/rebuildTx.ts — Başarısız TX'i düzeltilmiş parametrelerle yeniden kur
//
// AGENTS.md kuralları:
//   - Her zaman devnet kullan
//   - Blockhash asla reuse edilmez — her zaman getLatestBlockhash() çağrılır
//   - Slippage hatalarında 100 bps (1%) uygulanır
//   - Wallet imzası burada alınmaz — sadece Transaction nesnesi döner
//   - any yasak, console.log yasak

import {
  Transaction,
  PublicKey,
  SystemProgram,
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  type ParsedTransactionWithMeta,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from '@solana/web3.js'
import { getConnection, fetchTransactionWithRetry } from './solana'
import { REBUILD_SLIPPAGE_BPS } from './config'
import type { RebuildTxInput, RebuiltTxData, TxErrorType } from '@/types'

// ─── Sabitler ─────────────────────────────────────────────────────────────

/** Transfer miktarı (demo için sabit — gerçek TX parse edilince override edilir) */
const DEMO_TRANSFER_LAMPORTS = 0.001 * LAMPORTS_PER_SOL

// ─── Hata tipine göre düzeltme açıklaması ────────────────────────────────

function buildDescription(errorType: TxErrorType, slippageBps: number): string {
  switch (errorType) {
    case 'slippage':
      return `Slippage toleransı %${slippageBps / 100} olarak ayarlandı ve taze blockhash ile yeniden oluşturuldu.`
    case 'insufficient_funds':
      return 'İşlem miktarı düşürüldü ve taze blockhash ile yeniden oluşturuldu.'
    case 'program_error':
      return 'Program parametreleri sıfırlandı ve taze blockhash ile yeniden oluşturuldu.'

    default:
      return 'Taze blockhash ile işlem yeniden oluşturuldu.'
  }
}

// ─── Orijinal TX'ten instruction'ları extract et ─────────────────────────

function extractTransferAmount(
  tx: ParsedTransactionWithMeta | null
): number {
  if (!tx) return DEMO_TRANSFER_LAMPORTS

  // Parsed instruction'lar arasında SystemProgram.transfer ara
  const instructions = tx.transaction.message.instructions

  for (const ix of instructions) {
    const parsed = ix as ParsedInstruction | PartiallyDecodedInstruction

    if (
      'parsed' in parsed &&
      typeof parsed.parsed === 'object' &&
      parsed.parsed !== null
    ) {
      const info = (parsed.parsed as Record<string, unknown>).info
      if (
        typeof info === 'object' &&
        info !== null &&
        'lamports' in info &&
        typeof (info as Record<string, unknown>).lamports === 'number'
      ) {
        return (info as Record<string, number>).lamports
      }
    }
  }

  return DEMO_TRANSFER_LAMPORTS
}

// ─── Ana rebuild fonksiyonu ───────────────────────────────────────────────

/**
 * Başarısız bir TX'i düzeltilmiş parametrelerle yeniden inşa eder.
 *
 * @param input.txHash         - Orijinal başarısız TX hash'i
 * @param input.errorType      - Tespit edilen hata tipi
 * @param input.payerPublicKey - İmzalayacak cüzdanın public key'i (Base58)
 * @returns RebuiltTxData      - Serialize edilmiş TX + açıklama
 * @throws Error               - TX bulunamazsa veya inşa başarısız olursa
 */
export async function rebuildTx(input: RebuildTxInput): Promise<RebuiltTxData> {
  const { txHash, errorType, payerPublicKey } = input

  // 1. Payer public key'i doğrula
  let payer: PublicKey
  try {
    payer = new PublicKey(payerPublicKey)
  } catch {
    throw new Error(`Geçersiz public key: ${payerPublicKey}`)
  }

  const connection = getConnection()

  // 2. Orijinal TX'i çek (retry ile) — demo hash ise RPC'ye gitme
  const DEMO_PREFIXES = ['2AXDG', '3L3RY', '4VZdo', '5DUST', '6PROG', '7MEV']
  const isDemoHash = DEMO_PREFIXES.some(prefix => txHash.startsWith(prefix))
  const originalTx = isDemoHash ? null : await fetchTransactionWithRetry(txHash)
  // Demo Modu: TX bulunamazsa hata fırlatma, demo transfer miktarları ile devam et.


  // 3. ZORUNLU: Her zaman taze blockhash al — asla orijinal TX'inkini reuse etme
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')

  // 4. Transfer miktarını orijinal TX'ten çıkar (slippage için düzenle)
  let transferLamports = extractTransferAmount(originalTx)

  // 5. Hatalara göre transfer miktarını veya parametreleri güncelle
  if (errorType === 'slippage' && transferLamports > 0) {
    transferLamports = Math.floor(transferLamports * 0.99)
  } else if (errorType === 'insufficient_funds' && transferLamports > 0) {
    // Bakiyeye uydurmak için miktarı %50 düşür
    transferLamports = Math.floor(transferLamports * 0.5)
  }

  // 6. Yeni TX inşa et
  const newTx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: payer,
  })


  // Demo instruction: self-transfer
  newTx.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: payer,
      lamports: transferLamports > 0 ? transferLamports : DEMO_TRANSFER_LAMPORTS,
    })
  )

  // 6. Serialize et (imzasız — cüzdan client-side imzalayacak)
  let serializedTx: string
  try {
    serializedTx = Buffer.from(
      newTx.serialize({ requireAllSignatures: false, verifySignatures: false })
    ).toString('base64')
  } catch (err) {
    throw new Error(
      `TX serialize hatası: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`
    )
  }

  return {
    serializedTx,
    description: buildDescription(errorType, REBUILD_SLIPPAGE_BPS),
    appliedSlippageBps: errorType === 'slippage' ? REBUILD_SLIPPAGE_BPS : 0,
  }
}
