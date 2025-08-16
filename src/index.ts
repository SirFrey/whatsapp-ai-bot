// Load environment variables from .env file
import 'dotenv/config';
import path from "path";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  proto,
} from "baileys";
import OpenAI from "openai";
import qrcode from "qrcode";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// -------- Web UI server & SSE for QR/status --------
import http from 'http';
import fs from 'fs';
import net from 'net'; // For port checking
// SSE clients to notify QR and status
const sseClients: http.ServerResponse[] = [];

// SSE helpers and runtime stats/logs
const processStart = Date.now();
let currentBotNumber: string | undefined;

let statsInterval: ReturnType<typeof setInterval> | null = null;
let activeSock: ReturnType<typeof makeWASocket> | null = null;
let lastStatus: string = 'initializing';
let lastQrDataUrl: string | null = null;
let reconnectInProgress = false;
let botStarting = false;

type LogEntry = { level: 'info' | 'warn' | 'error'; msg: string; args: any[]; ts: string };
const recentLogs: LogEntry[] = [];
const MAX_RECENT_LOGS = 200;

// Port availability checker
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

// Find an available port starting from the preferred port
async function findAvailablePort(startPort: number = 3000, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

function sseBroadcast(event: string, data: string) {
  const safeData = (data === undefined || data === null) ? '' : String(data);
  for (const client of sseClients) {
    try {
      client.write(`event: ${event}\n`);
      client.write(`data: ${safeData}\n\n`);
    } catch {}
  }
}

function broadcastStatus(status: string) {
  lastStatus = status;
  sseBroadcast('status', status);
}

function pushRecentLog(entry: LogEntry) {
  recentLogs.push(entry);
  if (recentLogs.length > MAX_RECENT_LOGS) recentLogs.shift();
  try { sseBroadcast('log', JSON.stringify(entry)); } catch {}
}

function computeStats() {
  let totalAppointments = 0;
  for (const arr of appointments.values()) totalAppointments += Array.isArray(arr) ? arr.length : 0;
  return {
    sseClients: sseClients.length,
    conversations: conversations.size,
    appointments: totalAppointments,
    botNumber: currentBotNumber || null,
    manualOverrides: 0,
    uptimeSec: Math.floor((Date.now() - processStart) / 1000),
  };
}

function startWebServer(port = 3000): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = req.url || '/';
      if (url === '/' || url === '/index.html') {
        const filePath = path.join(process.cwd(), 'public', 'index.html');
        fs.readFile(filePath, (err, data) => {
          if (err) return res.writeHead(500).end('Error loading index.html');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(data);
        });
      } else if (url === '/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        res.write('\n');
        sseClients.push(res);
        req.on('close', () => {
          const i = sseClients.indexOf(res);
          if (i >= 0) sseClients.splice(i, 1);
        });
        // Send initial snapshot: last logs and a stats sample
        for (const entry of recentLogs) {
          try {
            res.write(`event: log\n`);
            res.write(`data: ${JSON.stringify(entry)}\n\n`);
          } catch {}
        }
        const snapshot = computeStats();
        try {
          res.write(`event: stats\n`);
          res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
        } catch {}
        // Send current status & QR snapshot
        try {
    res.write(`event: status\n`);
    res.write(`data: ${(lastStatus || 'unknown')}\n\n`);
  } catch {}
  try {
    res.write(`event: qr\n`);
    res.write(`data: ${(lastQrDataUrl || '')}\n\n`);
  } catch {}
      } else if (url === '/api/reconnect' && req.method === 'POST') {
        // Manual reconnect without deleting auth
        requestReconnect({ resetAuth: false });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/reset-login' && req.method === 'POST') {
        // Full reset: delete auth and restart
        requestReconnect({ resetAuth: true });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } else if (url === '/api/snapshot' && req.method === 'GET') {
        const body = {
    status: lastStatus || 'unknown',
    qrDataUrl: lastQrDataUrl || '',
    stats: computeStats(),
    logs: Array.isArray(recentLogs) ? recentLogs.slice(-100) : [],
  };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      } else if (url.startsWith('/assets/')) {
        // Serve static assets from public/assets
        const normalized = path.normalize(url).replace(/^\.\.(\/|\\)/, '');
        const relPath = normalized.replace(/^\/+/, ''); // strip leading '/'
        const assetPath = path.join(process.cwd(), 'public', relPath);
        // Ensure the path stays within public
        const publicDir = path.join(process.cwd(), 'public');
        if (!assetPath.startsWith(publicDir)) {
          res.writeHead(403).end('Forbidden');
          return;
        }
        fs.readFile(assetPath, (err, data) => {
          if (err) {
            res.writeHead(404).end('Not found');
            return;
          }
          const ext = path.extname(assetPath).toLowerCase();
          const ctype = ext === '.js' ? 'text/javascript; charset=utf-8'
            : ext === '.css' ? 'text/css; charset=utf-8'
            : ext === '.json' ? 'application/json'
            : ext === '.png' ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
            : ext === '.svg' ? 'image/svg+xml'
            : 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': ctype });
          res.end(data);
        });
      } else {
        res.writeHead(404).end();
      }
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logWarn(`Puerto ${port} ya está en uso`);
        reject(new Error(`Port ${port} is already in use`));
      } else {
        logError(`Error del servidor en puerto ${port}:`, err);
        reject(err);
      }
    });

    server.listen(port, () => {
      logInfo(`Servidor web ejecutándose en http://localhost:${port}`);
      resolve(port);
      import('open').then(open => open.default(`http://localhost:${port}`));
    });

    // Periodic stats broadcast (once)
    if (!statsInterval) {
      statsInterval = setInterval(() => {
        try {
          const stats = computeStats();
          sseBroadcast('stats', JSON.stringify(stats));
        } catch {}
      }, 1000);
    }
  });
}

// Function to start web server with automatic port fallback
async function startWebServerWithFallback(preferredPort: number = 3000): Promise<number> {
  try {
    // First try the preferred port
    return await startWebServer(preferredPort);
  } catch (error) {
    // If preferred port fails, find an available port
    logWarn(`Puerto preferido ${preferredPort} no disponible, buscando puerto alternativo...`);
    try {
      const availablePort = await findAvailablePort(preferredPort);
      logInfo(`Puerto alternativo encontrado: ${availablePort}`);
      return await startWebServer(availablePort);
    } catch (fallbackError) {
      logError('No se pudo encontrar un puerto disponible:', fallbackError);
      throw new Error('No available ports found for web server');
    }
  }
}

function requestReconnect(opts: { resetAuth: boolean }) {
  if (reconnectInProgress) {
    logWarn('Reconnect already in progress, ignoring duplicate request.');
    return;
  }
  reconnectInProgress = true;
  if (opts.resetAuth) {
    try {
      fs.rmSync(authFolder, { recursive: true, force: true });
      logWarn('Auth info removed by user request');
    } catch (e) {
      logError('Failed to remove auth info on reset-login:', e);
    }
  }
  // Close existing socket if any
  try {
    if (activeSock && (activeSock as any).ws && typeof (activeSock as any).ws.close === 'function') {
      (activeSock as any).ws.close();
    }
  } catch {}
  broadcastStatus(opts.resetAuth ? 'logged_out' : 'reconnecting');
  setTimeout(() => {
    startWhatsAppBot();
    // reconnectInProgress will be reset in startWhatsAppBot after connection update
  }, 500);
}

// ========== CONFIG ==========
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY in environment.");
  process.exit(1);
}

// Default timezone (IANA); Venezuela is UTC-4 with no DST
const DEFAULT_TZ = process.env.BOT_DEFAULT_TZ || "America/Caracas";

// OpenAI-compatible client against DeepSeek
const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// Conversation history map per chat
import type { ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "openai/resources/chat/completions";
type ChatMessage = ChatCompletionMessageParam;
const conversations = new Map<string, ChatMessage[]>();

// Structured context per chat (not MCP spec)
interface BotContext {
  user: { phone: string; name?: string; tz?: string };
  appointmentHistory: Appointment[];
  clinic: { hours: string; address: string; tz?: string };
}
const contexts = new Map<string, BotContext>();

// Limits
const MAX_HISTORY = 20;

// Allowed senders (numbers without '+')
const ALLOWED_NUMBERS = ["+584242392804", "+584242479230","+584241739982", "+584241739982" ].map((n) =>
  n.replace(/^\+/, ""),
);

// System prompt
const SYSTEM_PROMPT =
  "Eres el asistente virtual de la Dra. Reina, te encuentras dentro de un consultorio dental. Responde con frases breves y claras. " +
  "En tu primer mensaje, presentate y preguntale al cliente que desea de forma corta, concisa y formal. " +
  "Si el usuario desea reservar una cita, pregunta qué servicio dental necesita y luego solicita su nombre completo. " +
  "No envíes el enlace de reserva hasta haber recibido y confirmado ambos datos (servicio y nombre). " +
  "Cuando los obtengas, llama a la función generate_booking_url con los parámetros name y service, y comparte el enlace para que el usuario elija fecha y hora. " +
  "Si el usuario no desea reservar pero hace preguntas sobre limpieza dental, horarios de atención, dirección u otros temas relacionados con odontología, proporciona información relevante sin mencionar el enlace de reserva. " +
  "Si el usuario aborda temas no relacionados con odontología, infórmale amablemente que solo puedes ayudar con información y gestión de reservas odontologicas, y redirígelo al tema principal. " +
  "IMPORTANTE: Cuando el usuario pregunte sobre precios, servicios disponibles o costos, siempre consulta y proporciona la información de nuestra lista oficial de precios. Estos son TODOS los servicios y precios que ofrecemos: " +
  "Consulta: 10$ " +
  "Consulta + Limpieza dental con ultrasonido 25$ " +
  "Ortodoncia superior e inferior: 100$ (Incluye consulta + limpieza dental con ultrasonido) " +
  "Eliminación de caries y restauraciones con resina en dientes permanente (adulto) entre: 20$, 25$, 30$, 35$, 40$ o 45$ " +
  "Eliminación de caries y restauraciones con resina en dientes temporales (niños) entre 20$/25$/30$ " +
  "Endodoncia Monoradicular o Multirradicular: 150$/250$ " +
  "Extracciones: Dientes temporales (Niños): 20$/25$/30$, Dientes permanentes: (adulto) 30$/35$, Extracción de Cordales entre: 50$ y 80$ " +
  "Gingivectomia (recorte de encía) 60$ " +
  "Frenilectomia (Recorte de frenillo) 60$ " +
  "Prótesis Dental (debe asistir a consulta para evaluar que tipo de prótesis necesita) " +
  "Realizamos Retenedores: 85$ " +
  "Trabajamos previa cita. Utiliza esta información de precios para responder consultas sobre costos y ayudar a los pacientes a entender qué servicios ofrecemos. " +
  "DIRECCIÓN DEL CONSULTORIO: Centro Perú, Torre A, Piso 10, Consultorio 109, Avenida Francisco de Miranda.";

// Rate limiting
const RATE_LIMIT_MS = 2_000;
const MAX_INPUT_LENGTH = 1_000;
const lastMessageTimestamps = new Map<string, number>();

// Appointments
type Appointment = {
  date: string;
  time: string;
  name: string;
  phone: string;
  service: string;
};
const appointments = new Map<string, Appointment[]>();

// ---------- Tools (Tools API) ----------
// 1) Create appointment (function tool)
const TOOL_GENERATE_BOOK_URL = {
  type: "function",
  function: {
    name: "generate_booking_url",
    description:
      "Genera un enlace de reserva de Cal.com usando nombre y servicio proporcionados",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nombre completo del cliente" },
        service: { type: "string", description: "Tipo de servicio dental" },
      },
      required: ["name", "service"],
    },
  },
} as const;

// 2) Get current date/time (function tool)
const TOOL_GET_DATETIME = {
  type: "function",
  function: {
    name: "get_datetime",
    description:
      "Devuelve fecha/hora actuales, día de semana y zona horaria. Usa IANA TZ (ej. America/Caracas).",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description:
            "IANA TZ; si falta, usar la del usuario/clinica o el valor por defecto.",
        },
        locale: {
          type: "string",
          description: "Locale para formateo; por defecto es-ES.",
        },
      },
      required: [],
    },
  },
} as const;

// ---------- Logger ----------
const logInfo = (msg: string, ...args: any[]) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [INFO] ${msg}`, ...args);
  pushRecentLog({ level: 'info', msg, args, ts });
};
const logWarn = (msg: string, ...args: any[]) => {
  const ts = new Date().toISOString();
  console.warn(`[${ts}] [WARN] ${msg}`, ...args);
  pushRecentLog({ level: 'warn', msg, args, ts });
};
const logError = (msg: string, ...args: any[]) => {
  const ts = new Date().toISOString();
  console.error(`[${ts}] [ERROR] ${msg}`, ...args);
  pushRecentLog({ level: 'error', msg, args, ts });
};

// WA auth state directory
const authFolder = path.resolve(process.cwd(), "auth_info");

// ---------- Date/Time util ----------
function getNowInfo(opts?: { timezone?: string; locale?: string }) {
  const tz = opts?.timezone || DEFAULT_TZ;
  const locale = opts?.locale || "es-ES";
  const now = new Date();

  const localDate = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const localTime = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const dayOfWeek = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
  }).format(now);

  return {
    timezone: tz,
    iso: now.toISOString(),
    localDate,
    localTime,
    dayOfWeek,
  };
}

function buildTimeAnchor(tz?: string, locale = "es-VE") {
  const info = getNowInfo({ timezone: tz, locale });
  // Compact, model-friendly line: includes current year explicitly.
  return `NOW_ANCHOR:: {"timezone":"${info.timezone}","iso":"${info.iso}","localDate":"${info.localDate}","localTime":"${info.localTime}","dayOfWeek":"${info.dayOfWeek}","currentYear":"${new Date(info.iso).getUTCFullYear()}"}`;
}

// ---------- Agent executor (Tools API with tool_calls) ----------
async function runAgent(
  messagesForAPI: ChatMessage[],
  options?: { onTool?: (e: any) => void; forceGetTime?: boolean },
) {
  const MAX_STEPS = 3;
  let msgs: ChatCompletionMessageParam[] = [...messagesForAPI];

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: msgs,
      tools: [
        TOOL_GENERATE_BOOK_URL,
        TOOL_GET_DATETIME,
      ],
      tool_choice: options?.forceGetTime
        ? { type: "function", function: { name: "get_datetime" } }
        : "auto",
    });

    const choice = completion.choices?.[0]?.message as ChatCompletionMessageParam & { tool_calls?: any[] };
    if (!choice) return { type: "final", content: "No response." } as const;

    const calls = (choice as any).tool_calls;
    if (calls && calls.length) {
      // MUST push the assistant message that contains tool_calls first (per Tools API).
      msgs.push(choice);

      for (const tc of calls) {
        const fn = tc.function?.name;
        const raw = tc.function?.arguments || "{}";
        let args: any = {};
        try {
          args = JSON.parse(raw);
        } catch {}

        try {
          if (fn === "generate_booking_url") {
            // Build Cal.com booking link using provided name and service
            options?.onTool?.({ source: "appt", phase: "call", name: fn!, args });
            const { name, service } = args;
            const nameParam = encodeURIComponent(String(name || ""));
            const serviceParam = encodeURIComponent(String(service || ""));
            const user = process.env.CALCOM_USERNAME;
            const slug = process.env.CALCOM_EVENT_TYPE_SLUG;
            const eventId = process.env.CALCOM_EVENT_TYPE_ID;
            let url = "";
            if (user && slug) {
              url = `https://cal.com/${user}/${slug}?name=${nameParam}&service=${serviceParam}`;
              console.log(`Using user/slug: ${user}/${slug}`);
            } else if (eventId) {
              url = `https://cal.com/book/${eventId}?name=${nameParam}&service=${serviceParam}`;
              console.log(`Using default book`, "urs", user)
            } else {
              url = "https://cal.com/booking";
            }
            const result = { url };
            options?.onTool?.({ source: "appt", phase: "result", name: fn!, args, resultSummary: `url=${url}` });
            // Return as function call so that the agent can process it
            return {
              type: "function",
              name: "generate_booking_url",
              arguments: JSON.stringify(result),
            } as const;
          } else {
            const toolMsg: ChatCompletionToolMessageParam = {
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ error: `Unknown tool: ${fn}` }),
            };
            msgs.push(toolMsg);
          }
        } catch (err) {
          options?.onTool?.({
            source: "cal",
            phase: "error",
            name: fn ?? "unknown",
            args,
            error: String(err),
          });
          const toolMsg: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              error: "Tool execution error",
              detail: String(err),
            }),
          };
          msgs.push(toolMsg);
        }
      }
      continue; // let the model read tool outputs and produce a final reply
    }

    if (typeof choice.content === "string" && choice.content.trim()) {
      return { type: "final", content: choice.content.trim() } as const;
    }
  }

  return {
    type: "final",
    content: "¿Qué día y horario prefieres para tu cita?",
  } as const;
}

// ========== SHARED MESSAGE HANDLER ==========
async function handleIncomingMessage(
  chatId: string,
  userVisibleSender: string,
  text: string,
  sendFn: (msg: any) => Promise<void> | void,
  opts?: { onTool?: (e: any) => void },
) {
  if (text.length > MAX_INPUT_LENGTH) {
    await sendFn(
      `El mensaje es demasiado largo. Por favor envía menos de ${MAX_INPUT_LENGTH} caracteres.`,
    );
    return;
  }

  const now = Date.now();
  const last = lastMessageTimestamps.get(chatId) || 0;
  if (now - last < RATE_LIMIT_MS) {
    const waitSec = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
    await sendFn(
      `Por favor espera ${waitSec} segundos antes de enviar otro mensaje.`,
    );
    return;
  }
  lastMessageTimestamps.set(chatId, now);

  if (!contexts.has(chatId)) {
    contexts.set(chatId, {
      user: { phone: userVisibleSender, tz: DEFAULT_TZ },
      appointmentHistory: appointments.get(chatId) || [],
      clinic: {
        hours: "Lun-Vie 9:00-18:00",
        address: "Centro Perú, Torre A, Piso 10, Consultorio 109, Avenida Francisco de Miranda",
        tz: DEFAULT_TZ,
      },
    });
  }
  const ctx = contexts.get(chatId)!;
  let history = conversations.get(chatId) || [];
  history.push({ role: "user", content: text });
  if (history.length > MAX_HISTORY)
    history.splice(0, history.length - MAX_HISTORY);
  conversations.set(chatId, history);

  try {
    const tz = ctx.user.tz || ctx.clinic.tz || DEFAULT_TZ;
    const timeAnchorMsg: ChatMessage = {
      role: "system",
      content: buildTimeAnchor(tz, "es-VE"),
    };
    // Build messages (include your NOW_ANCHOR/time anchor if added earlier)
    const ctxMsg: ChatMessage = {
      role: "system",
      content: JSON.stringify(ctx),
    };
    const promptMsg: ChatMessage = { role: "system", content: SYSTEM_PROMPT };
    const messagesForAPI: ChatMessage[] = [ctxMsg, promptMsg, ...history];

    // Optional heuristic to force time tool on date/time queries
    const wantsTime =
      /\b(hora|fecha|día|dia|año|ano|today|time|date|year)\b/i.test(text);

    const result = await runAgent(messagesForAPI, {
      onTool: opts?.onTool,
      forceGetTime: wantsTime,
    });

    // Handle dynamic Cal.com booking link generation
    if (result.type === "function" && result.name === "generate_booking_url") {
      let payload: any = {};
      try {
        payload = JSON.parse(result.arguments || "{}");
      } catch {}
      let url: string = payload.url || "";
      const phone = userVisibleSender.replace(/^\+/, "");
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}attendeePhoneNumber=+${encodeURIComponent(phone)}&smsReminderNumber=+${encodeURIComponent(phone)}`;
      const msg = `Aquí tienes tu enlace para completar la reserva:\n${url}`;
      await sendFn(msg);
      history.push({ role: "assistant", content: msg });
      if (history.length > MAX_HISTORY)
        history.splice(0, history.length - MAX_HISTORY);
      conversations.set(chatId, history);
      return;
    }

    if (result.type === "final") {
      await sendFn(result.content);
      history.push({ role: "assistant", content: result.content });
      if (history.length > MAX_HISTORY)
        history.splice(0, history.length - MAX_HISTORY);
      conversations.set(chatId, history);
    }
  } catch (err) {
    logError("Error generating reply:", err);
    await sendFn(
      "Lo siento, hubo un error generando la respuesta. Intenta nuevamente.",
    );
  }
}

// ========== WHATSAPP MODE ==========
async function startWhatsAppBot() {
  if (botStarting) {
    logWarn('Bot is already starting, skipping duplicate startWhatsAppBot call.');
    return;
  }
  botStarting = true;
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logInfo(`Using WA version ${version.join(".")}, isLatest: ${isLatest}`);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const sock = makeWASocket({ version, auth: state });
  activeSock = sock;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  async function humanSend(to: string, msg: any) {
    // Subscribe to presence updates and indicate typing
    try {
      await sock.presenceSubscribe(to);
    } catch {}
    try {
      await sock.sendPresenceUpdate('composing', to);
    } catch {}
    await sleep(800);
    try {
      if (typeof msg === 'string') {
        await sock.sendMessage(to, { text: msg });
      } else if (msg && typeof msg === 'object') {
        // Allow custom nodes like templateMessage or viewOnce->interactiveMessage
        await sock.sendMessage(to, msg as any);
      } else {
        await sock.sendMessage(to, { text: 'Ocurrió un error al generar el mensaje de reserva. Por favor intenta nuevamente.' });
      }
    } catch (err) {
      logError('Fallo sock.sendMessage:', err);
      try {
        await sock.sendMessage(to, { text: 'Ocurrió un error al enviar el mensaje. Intenta nuevamente.' });
      } catch (err2) {
        logError('Fallo sock.sendMessage (fallback):', err2);
      }
    }
    // Indicate typing stopped
    try {
      await sock.sendPresenceUpdate('paused', to);
    } catch {}
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update as any;
    try {
      // capture our bot number when available
      if ((sock as any).user?.id) {
        const jid: string = (sock as any).user.id;
        currentBotNumber = jid.split('@')[0];
      }
    } catch {}
    if (qr) {
      try {
        const qrCode = await qrcode.toString(qr, {
          type: "terminal",
          small: true,
        });
        console.log(qrCode);
        // send QR image to web UI
        try {
          const dataUrl = await qrcode.toDataURL(qr);
          lastQrDataUrl = dataUrl;
          sseBroadcast('qr', dataUrl);
        } catch {}
      } catch (err) {
        logError("Failed to generate QR code", err);
      }
    }
    if (connection === "close") {
      botStarting = false;
      // Check for Baileys stream:error conflict (session replaced)
      const error = lastDisconnect?.error as any;
      const status = error?.output?.statusCode;
      const isConflict = error?.message?.includes('conflict') || (error?.output?.payload && String(error.output.payload).includes('conflict'));
      if (isConflict) {
        logError("WhatsApp session conflict detected (stream:error type replaced). Stopping auto-reconnect. You are likely logged in elsewhere.");
        broadcastStatus('conflict');
        reconnectInProgress = false;
        return;
      }
      if (status === DisconnectReason.loggedOut) {
        logError("Logged out. Deleting auth_info and restarting for fresh login.");
        // notify status to web UI
        broadcastStatus('logged_out');
        // Delete auth_info folder and restart
        try {
          fs.rmSync(authFolder, { recursive: true, force: true });
        } catch (e) {
          logError("Failed to delete auth_info folder:", e);
        }
        setTimeout(() => {
          reconnectInProgress = false;
          startWhatsAppBot();
        }, 2000);
      } else {
        // Try to reconnect automatically
        setTimeout(() => {
          reconnectInProgress = false;
          startWhatsAppBot();
        }, 2000);
        broadcastStatus('close');
      }
    } else if (connection === "open") {
      botStarting = false;
      logInfo("Connected to WhatsApp");
      lastQrDataUrl = null; // no need to show QR while connected
      broadcastStatus('open');
      reconnectInProgress = false;
      if (currentBotNumber) logInfo(`Bot number: ${currentBotNumber}`);
    }
  });

  // Remove invalid event handler for connection.error
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    const message = m.messages?.[0];
    if (!message?.message || message.key.fromMe) return;
    const from = message.key.remoteJid!;
    const remoteNumber = from.split("@")[0];
    if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(remoteNumber))
      return;

    const text =
      message.message.conversation || message.message.extendedTextMessage?.text;
    if (!text) return;
  logInfo(`Incoming message from ${remoteNumber}: ${text}`);

    await handleIncomingMessage(from, remoteNumber, text, async (reply) => {
  logInfo(`Sending reply to ${remoteNumber}`);
      await humanSend(from, reply);
    });
  });
}

// ========== TERMINAL (CLI) MODE ==========
async function startCliChat() {
  const rl = readline.createInterface({ input, output });
  const chatId = "cli";
  const userLabel = "+584242057621";

  console.log(
    "CLI chat iniciado. Comandos: '/reset', '/tz <IANA>', '/exit'.\n",
  );

  const cliToolLogger = (e: any) => {
    const ts = new Date().toISOString();
    if (e.source === "cal") {
      if (e.phase === "call") {
        console.log(
          `[${ts}] [CLI][CAL][CALL] ${e.name} args=${JSON.stringify(e.args)}`,
        );
      } else if (e.phase === "result") {
        console.log(
          `[${ts}] [CLI][CAL][RESULT] ${e.name} ${e.resultSummary ?? ""}`,
        );
      } else if (e.phase === "error") {
        console.log(`[${ts}] [CLI][CAL][ERROR] ${e.name} ${e.error ?? ""}`);
      }
    } else if (e.source === "time") {
      if (e.phase === "result") {
        console.log(`[${ts}] [CLI][TIME] ${e.resultSummary}`);
      }
    }
  };

  const sendFn = async (text: string) => console.log(`\nAsistente: ${text}\n`);

  const resetContext = () => {
    conversations.delete(chatId);
    contexts.set(chatId, {
      user: { phone: userLabel, tz: DEFAULT_TZ },
      appointmentHistory: appointments.get(chatId) || [],
      clinic: {
        hours: "Lun-Vie 9:00-18:00",
        address: "Calle Falsa 123",
        tz: DEFAULT_TZ,
      },
    });
    console.log("(contexto reiniciado)\n");
  };

  resetContext();

  while (true) {
    const user = (await rl.question("Tú: ")).trim();
    if (!user) continue;
    if (user === "/exit") break;
    if (user === "/reset") {
      resetContext();
      continue;
    }
    if (user.startsWith("/tz ")) {
      const tz = user.slice(4).trim();
      const ctx = contexts.get(chatId)!;
      ctx.user.tz = tz;
      ctx.clinic.tz = tz;
      contexts.set(chatId, ctx);
      console.log(`(zona horaria establecida en ${tz})\n`);
      continue;
    }

    await handleIncomingMessage(chatId, userLabel, user, sendFn, {
      onTool: cliToolLogger,
    });
  }

  await rl.close();
  console.log("CLI chat finalizado.");
}

// ========== ENTRYPOINT ==========
(async () => {
  const useCli = process.argv.includes("--cli");
  if (useCli) {
    await startCliChat();
  } else {
    // Start web UI server with automatic port fallback
    try {
      // Check for custom port from command line arguments, environment variable, or default to 3000
      let preferredPort = 3000;
      
      // Check for -p or --port flag
      const portArgIndex = process.argv.findIndex(arg => arg === '-p' || arg === '--port');
      if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
        const portArg = parseInt(process.argv[portArgIndex + 1], 10);
        if (!isNaN(portArg) && portArg > 0 && portArg <= 65535) {
          preferredPort = portArg;
          logInfo(`🔧 Puerto especificado por línea de comandos: ${preferredPort}`);
        } else {
          logWarn(`Puerto inválido especificado: ${process.argv[portArgIndex + 1]}, usando puerto por defecto: ${preferredPort}`);
        }
      }
      // Check environment variable if no command line argument
      else if (process.env.PORT) {
        const envPort = parseInt(process.env.PORT, 10);
        if (!isNaN(envPort) && envPort > 0 && envPort <= 65535) {
          preferredPort = envPort;
          logInfo(`🔧 Puerto especificado por variable de entorno: ${preferredPort}`);
        }
      }
      
      const actualPort = await startWebServerWithFallback(preferredPort);
      logInfo(`🌐 Panel de control disponible en: http://localhost:${actualPort}`);
      
      if (actualPort !== preferredPort) {
        logInfo(`💡 Nota: El puerto preferido ${preferredPort} no estaba disponible, usando puerto ${actualPort}`);
      }
    } catch (error) {
      logError('Error iniciando servidor web:', error);
      process.exit(1);
    }
    await startWhatsAppBot();
  }
})();
