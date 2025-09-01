# Repository Guidelines

## Project Structure & Module Organization
- `src/index.ts`: Main entry. Starts WhatsApp bot (Baileys) and a small web UI (SSE on `/events`) for QR/status.
- `src/utils/`: Utilities (`cal.ts`, `helpers.ts`) for Cal.com tools and helpers.
- `public/`: Static web UI served at `http://localhost:3000`.
 
- `dist/`: Build output (`run`, `run-win.js`, `run-win.cmd`, `public/`, copied `.env`).
- `auth_info/`: Local Baileys auth state (ignored by git).

## Build, Test, and Development Commands
- `npm install`: Install dependencies.
- `npm start` or `npm run dev`: Run bot + web UI on port 3000. Scan the QR in the browser.
- `npm run dev -- --cli`: Local CLI chat without WhatsApp; useful for quick tests.
- `npm run build`: Build TypeScript to `dist/`.
- `bun run build-win`: Bundle Windows-friendly files (run via `dist\run-win.cmd`).

## Coding Style & Naming Conventions
- Language: TypeScript, ES modules, strict mode (`tsconfig.json`).
- Indentation: 2 spaces; include semicolons; prefer single quotes.
- Names: `camelCase` for vars/functions, `PascalCase` for types, `UPPER_SNAKE_CASE` for env vars; file names lowercase.
- Imports: Node built-ins first, then third‑party, then local.
- Keep functions small and pure in `src/utils/`; avoid blocking the event loop in message handlers.

## Testing Guidelines
- No automated tests yet. Use `--cli` mode for fast manual checks.
- If adding tests, prefer `*.spec.ts` under `src/` or a `tests/` folder; keep units pure and mock Baileys/OpenAI/Cal.com.
- Aim for meaningful coverage on utilities and message flow helpers.

## Commit & Pull Request Guidelines
- Commits: Follow Conventional Commits (e.g., `feat(chatbot): add CLI mode`, `fix(cal): handle empty slots`).
- PRs: Include a concise description, linked issues, reproduction steps, and screenshots of the web UI if relevant. Note config/env changes.

## Security & Configuration Tips
- Configure via `.env` (see `.env.example`): `DEEPSEEK_API_KEY`, `CALCOM_*`. Never commit secrets.
- `auth_info/` is ignored; treat it as sensitive. Do not share QR codes or JIDs publicly.
- Be careful editing allowlists or clinic data in `src/index.ts`; avoid logging PII.
