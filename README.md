# WhatsApp AI Chatbot

This project is a low-budget WhatsApp AI chatbot using Bun, TypeScript, and Baileys. It listens for incoming WhatsApp messages, sends the content to OpenAI's Chat API, and replies with the generated response.

## Prerequisites
- [Bun](https://bun.sh/) installed
- A WhatsApp account for QR code login
- OpenAI API key

## Setup
1. Clone the repository and navigate to the project directory.
2. Copy `.env.example` to `.env` and set your `OPENAI_API_KEY`.
3. Install dependencies:
   ```bash
   bun install
   ```

## Running
```bash
bun run src/index.ts
```

Scan the displayed QR code with your WhatsApp mobile app. The session data will be saved to `auth_info.json`.

## Project Structure
- `src/index.ts`: Entry point, initializes Baileys socket, handles incoming messages, and interacts with OpenAI.
- `.env.example`: Example environment variables.
- `tsconfig.json`: TypeScript configuration.
---
Feel free to customize and extend as needed!
