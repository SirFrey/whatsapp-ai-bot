# WhatsApp AI Chatbot

Low-budget WhatsApp AI chatbot built with Bun, TypeScript, and Baileys. It uses an OpenAI-compatible client pointing to DeepSeek for responses and serves a small web UI for QR/status.

## Prerequisites
- Bun installed: https://bun.sh/
- A WhatsApp account (to pair via QR)
- DeepSeek API key (`DEEPSEEK_API_KEY`)
 

## Setup
1. Clone the repo and `cd` into it.
2. Copy `.env.example` to `.env` and set `DEEPSEEK_API_KEY`.
3. Install dependencies:
   ```bash
   bun install
   ```

## Run (dev)
```bash
bun run start
# or
bun run src/index.ts
```
Open http://localhost:3000 to view status and the QR. Scan it with WhatsApp to pair. Auth state is stored in `auth_info/` (git-ignored).

CLI-only mode (no WhatsApp):
```bash
bun run src/index.ts --cli
```

## Build
```bash
bun run build       # bundles to dist/, entry: ./dist/run (Unix)
bun run build-win   # bundles Windows-friendly files: dist\run-win.cmd
```

## Project Structure
- `src/index.ts`: Entrypoint; starts Baileys bot + web UI (SSE on `/events`). Uses DeepSeek via OpenAI client.
- `src/utils/`: Utilities such as `helpers.ts`.
- `public/`: Static UI served by the app.
- `scripts/build.mjs`: Bun bundling script; copies `.env` and `public/` to `dist/`.

## Notes & Security
- Configure via `.env`. Never commit secrets. Keep `auth_info/` private.
- The bot logs minimal info; avoid adding PII to logs. Update the allowlist and clinic details in `src/index.ts` with care.
