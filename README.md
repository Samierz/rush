<div align="center">
  <h1>RUSH — Voice-First Web3 Support Agent</h1>
  <p><strong>Stop losing users to confusing blockchain errors.</strong></p>
  <p>
    RUSH is an embeddable, AI-powered Web3 support SDK that instantly detects failed Solana transactions, explains the issue to the user via voice (TR/EN), and automatically prepares a corrected transaction for them to sign.
  </p>
</div>

<br />

## 🚨 The Problem
Web3 user experience is notoriously difficult. When a transaction fails on a DEX, users are usually met with cryptic error codes like `custom program error: 0x1771`. This leads to frustration, abandoned transactions, and a massive drop in conversion rates for dApps.

## 💡 The Solution
RUSH acts as an intelligent, voice-enabled support agent living right inside your dApp. 
When a transaction fails, RUSH:
1. **Parses** the on-chain Solana transaction logs.
2. **Analyzes** the error using **Google Gemini AI**.
3. **Explains** the exact problem to the user via **ElevenLabs** Voice Synthesis in plain, non-technical language.
4. **Resolves** the issue by preparing a brand new, corrected transaction (e.g., automatically adjusting slippage or amounts) for the user to sign.

---

## ✨ Features (Demo Scenarios Supported)
RUSH is capable of detecting and resolving complex DeFi issues instantly:

- 📉 **Slippage Tolerance Exceeded:** Automatically detects price impact failures and prepares a new transaction with higher slippage.
- 💰 **Insufficient Funds:** Detects lack of SOL for network fees and auto-adjusts the transaction amount to fit the wallet balance.
- 🚦 **Network Congestion:** Detects blockhash expiration and adds a small Priority Fee to the rebuilt transaction.
- 🐸 **MEV Bot Sandwich Attacks:** Detects Jito MEV monitor warnings and routes the corrected transaction through a private, encrypted RPC channel.
- 🪙 **Dust Errors:** Detects amounts below the rent-exemption threshold and adjusts accordingly.
- 🌍 **Bilingual Voice Support:** Seamlessly switches between English and Turkish voice explanations.

---

## 🛠️ Tech Stack
- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Blockchain:** Solana Web3.js, Wallet Adapter
- **AI / LLM:** Google Gemini (GenAI SDK)
- **Voice / TTS:** ElevenLabs (eleven_multilingual_v2)
- **RPC:** Helius Devnet

---

## 🚀 Getting Started (Local Development)

### 1. Clone the repository
```bash
git clone https://github.com/Samierz/rush.git
cd rush
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the DEX demo and trigger the RUSH agent.

---

## 📦 SDK Vision (Future Roadmap)
While the current repository includes a mock DEX environment for demonstration purposes, **RUSH is designed to be an npm package (`@rush-ai/react`)**. 
In the future, any Solana dApp (like Jupiter, Raydium, or MagicEden) will be able to integrate RUSH with a single component:

```tsx
import { RushProvider } from '@rush-ai/react';

export default function App({ children }) {
  return (
    <RushProvider rpcUrl="YOUR_RPC" language="en">
      {children}
    </RushProvider>
  );
}
```

---

<div align="center">
  <i>Built for the Dev3pack Global Hackathon</i>
</div>
