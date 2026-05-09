import React from 'react'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RUSH — Web3 Ses Destek Ajanı',
  description: 'Solana işlem hatalarını sesli analiz eden yapay zeka destek ajanı',
}

import { SolanaProvider } from '@/components/SolanaProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  )
}
