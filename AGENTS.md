# RUSH — Voice-First Web3 Customer Support Agent
## Antigravity AI Agent Rules (Claude Sonnet 4.6)

> This file lives in the project root. Antigravity reads it at every session.
> In case of conflict, this file takes precedence.

---

## Project Overview

RUSH is a voice-first Web3 customer support agent embedded directly inside a dApp.
When a user experiences a failed transaction, they click the support button.
The agent reads the blockchain logs, explains the issue in the user's language via voice,
and prepares a corrected transaction for signing.

**Hackathon:** Dev3pack Global Hackathon — May 8-10, 2026
**Demo scenario:** Failed Solana tx -> voice analysis -> new tx on signing screen

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v3 + shadcn/ui
- **Blockchain:** Solana (devnet) — @solana/web3.js v1
- **Wallet:** @solana/wallet-adapter-react
- **AI / LLM:** Anthropic Claude Sonnet 4.6 — @anthropic-ai/sdk
- **Voice TTS:** ElevenLabs — elevenlabs npm package
- **RPC:** Helius devnet endpoint
- **Deploy:** Vercel

---

## Folder Structure

```
rush/
├── app/
│   ├── api/
│   │   ├── parse-tx/route.ts      <- TX log parser
│   │   ├── analyze/route.ts       <- Claude Sonnet analysis
│   │   └── voice/route.ts         <- ElevenLabs TTS
│   ├── demo/page.tsx              <- Demo dApp page
│   └── layout.tsx
├── components/
│   ├── SupportWidget.tsx          <- Main widget (float button)
│   ├── VoicePlayer.tsx            <- Audio waveform + player
│   └── TxConfirmModal.tsx         <- New TX signing screen
├── lib/
│   ├── solana.ts                  <- RPC, getTransaction helpers
│   ├── txParser.ts                <- Error detection (slippage, gas, etc)
│   ├── rebuildTx.ts               <- Rebuild failed TX
│   └── claude.ts                  <- Anthropic SDK wrapper
├── hooks/
│   ├── useVoiceResponse.ts        <- TTS hook
│   └── useSupportAgent.ts         <- Main agent state machine
├── types/
│   └── index.ts                   <- All TS types here
├── .env.local                     <- Never commit
└── AGENTS.md                      <- This file
```

---

## Code Style Rules

- Use functional components only — no class components
- Prefer named exports; default export only for page.tsx files
- Interface: for object shapes. Type: for unions/intersections
- All async functions must be wrapped in try/catch
- API routes always return `{ error: string }` or `{ data: T }`
- No `any` type — use `unknown` and narrow it down
- Never use ENV variables directly — import from `lib/config.ts`
- No console.log — only `console.error` inside catch blocks

---

## Solana Rules

- **Always use devnet** — never touch mainnet
- RPC URL: read from `process.env.NEXT_PUBLIC_HELIUS_RPC`
- Add `maxSupportedTransactionVersion: 0` to all `getTransaction` calls
- When parsing TX logs, check for these error types:
  - `"SlippageToleranceExceeded"` -> slippage error
  - `"InsufficientFunds"` -> insufficient balance
  - `"custom program error: 0x1771"` -> Raydium slippage
  - `"AnchorError"` -> program error
- Set slippage to 1% (100 bps) when rebuilding TX
- Never sign wallet transactions on the backend — client-side only

---

## Claude Sonnet Integration Rules

- Model: `claude-sonnet-4-20250514` — do not use any other model
- `max_tokens`: 300 — keep responses short for voice output
- Write system prompt in Turkish — agent must respond in Turkish
- Response format: 2-3 sentences, no technical jargon, action-oriented
- API key: `process.env.ANTHROPIC_API_KEY` — server-side only
- Do not use streaming (MVP) — get full response in one call

Standard system prompt template:
```
You are RUSH, a Web3 support agent. Analyze the user's failed
Solana transaction and give a short, clear explanation in Turkish.
Maximum 2 sentences. No technical terms. Then say what will happen next.
```

---

## ElevenLabs TTS Rules

- Voice ID: `21m00Tcm4TlvDq8ikWAM` (Rachel) — add to .env if you want to change
- Model: `eleven_multilingual_v2` — use this model for Turkish
- Response format: `mp3_44100_128`
- Make TTS calls client-side — API key uses NEXT_PUBLIC_ prefix
- Do not autoplay audio — wait for user gesture (browser policy)
- If TTS fails, show text fallback instead of playing audio

---

## Agent Permissions

### Can do without asking:
- Read and write files
- Run linter and type-check (`tsc --noEmit`, `eslint`)
- Run individual tests
- Format code (`prettier`)

### Must ask first:
- `npm install` or adding new packages
- Modifying `.env.local`
- `git commit` or `git push`
- Deleting or heavily modifying existing API routes

### Never do:
- Use mainnet RPC
- Hardcode API keys into source code
- Modify config files outside `app/`
- Modify `package.json` scripts
- Trigger Vercel deploy

---

## Demo Flow

```
1. User clicks "Send Failed TX" button on the demo page
2. A TX designed to fail with slippage error is sent on devnet
3. TX fails — SupportWidget float button becomes active
4. User clicks the button — widget opens
5. useSupportAgent hook grabs the latest TX hash
6. /api/parse-tx -> TX logs are parsed, error type is identified
7. /api/analyze -> logs sent to Claude Sonnet, explanation generated
8. /api/voice -> text sent to ElevenLabs, audio URL returned
9. VoicePlayer plays audio ("Your slippage tolerance was too low...")
10. "Prepare fixed transaction" button appears
11. rebuildTx.ts builds new TX, wallet adapter opens signing screen
12. User signs -> TX sent to devnet -> success
```

---

## Environment Variables

```bash
# .env.local — never commit this file
NEXT_PUBLIC_HELIUS_RPC=https://devnet.helius-rpc.com/?api-key=XXX
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_ELEVENLABS_API_KEY=sk_...
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

---

## Hackathon Priorities

Time is tight. Follow this order strictly:

1. Does TX parser work? -> Finish this first
2. Does Claude Sonnet generate explanation? -> Then this
3. Does ElevenLabs audio play? -> Then this
4. Does Widget UI render? -> Then this
5. Rebuild TX + signing screen -> Last

Do NOT work on UI polish, animations, multi-chain support, or error boundaries
until the core demo flow works end to end.

---

## Known Constraints

- Solana devnet can be slow — set timeouts to 30s
- ElevenLabs free tier: 10,000 characters/month — enough for demo
- Antigravity Claude quota can run out — give one large prompt at critical steps
- Browser autoplay policy: audio requires a user gesture

---

Last updated: May 8, 2026 — RUSH Hackathon MVP