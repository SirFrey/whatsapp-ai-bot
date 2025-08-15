// Load environment variables from .env file
import 'dotenv/config';
import path from "path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "baileys";
import OpenAI from "openai";
import qrcode from "qrcode";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { calRequest, summarizeCalResult, ToolLogEvent } from "./utils/cal";

// -------- Web UI server & SSE for QR/status --------
import http from 'http';
import fs from 'fs';
// SSE clients to notify QR and status
const sseClients: http.ServerResponse[] = [];

function startWebServer(port = 3000) {
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      const filePath = path.join(process.cwd(), 'public', 'index.html');
      fs.readFile(filePath, (err, data) => {
        if (err) return res.writeHead(500).end('Error loading index.html');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
    } else if (req.url === '/events') {
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
    } else {
      res.writeHead(404).end();
    }
  });
  server.listen(port, () => {
    logInfo(`Web server running at http://localhost:${port}`);
    import('open').then(open => open.default(`http://localhost:${port}`));
  });
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
type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
};
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
const ALLOWED_NUMBERS = ["+584242392804", "+584242479230" ].map((n) =>
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
  "🔹 Consulta: 10$ " +
  "🔹 Consulta + Limpieza dental con ultrasonido 25$ " +
  "🔹 Ortodoncia superior e inferior: 100$ (Incluye consulta + limpieza dental con ultrasonido) " +
  "🔹 Eliminación de caries y restauraciones con resina en dientes permanente (adulto) entre: 20$, 25$, 30$, 35$, 40$ o 45$ " +
  "🔹 Eliminación de caries y restauraciones con resina en dientes temporales (niños) entre 20$/25$/30$ " +
  "🔹 Endodoncia Monoradicular o Multirradicular: 150$/250$ " +
  "🔹 Extracciones: Dientes temporales (Niños): 20$/25$/30$, Dientes permanentes: (adulto) 30$/35$, Extracción de Cordales entre: 50$ y 80$ " +
  "🔹 Gingivectomia (recorte de encía) 60$ " +
  "🔹 Frenilectomia (Recorte de frenillo) 60$ " +
  "🔹 Prótesis Dental (debe asistir a consulta para evaluar que tipo de prótesis necesita) " +
  "🔹 Realizamos Retenedores: 85$ " +
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
// ---- Cal.com Tools ----
const TOOL_CAL_GET_SLOTS = {
  type: "function",
  function: {
    name: "cal_get_slots",
    description:
      "Obtiene slots disponibles para un Event Type. Acepta eventTypeId o (username + eventTypeSlug). Devuelve la respuesta cruda de Cal.com.",
    parameters: {
      type: "object",
      properties: {
        eventTypeId: { type: "number", description: "ID del event type" },
        username: {
          type: "string",
          description: "username del usuario en Cal.com",
        },
        eventTypeSlug: { type: "string", description: "slug del event type" },
        start: {
          type: "string",
          description: "ISO date (YYYY-MM-DD) o ISO datetime",
        },
        end: {
          type: "string",
          description: "ISO date (YYYY-MM-DD) o ISO datetime",
        },
        timeZone: {
          type: "string",
          description: "Zona IANA (ej. America/Caracas)",
        },
      },
      required: ["start", "end"],
    },
  },
} as const;

const TOOL_CAL_GET_SCHEDULES = {
  type: "function",
  function: {
    name: "cal_get_schedules",
    description:
      "Lista los schedules (horarios/availability) del usuario autenticado, incluyendo timeZone y bloques por día.",
    parameters: { type: "object", properties: {} },
  },
} as const;

const TOOL_CAL_GET_EVENT_TYPES = {
  type: "function",
  function: {
    name: "cal_get_event_types",
    description:
      "Lista los event types del usuario (duración, buffers, scheduleId, etc.) para que el asistente entienda qué ofrecer.",
    parameters: { type: "object", properties: {} },
  },
} as const;

// 1) Create appointment (function tool)
// Tool to generate a Cal.com booking link after collecting user data
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
const logInfo = (msg: string, ...args: any[]) =>
  console.log(`[${new Date().toISOString()}] [INFO] ${msg}`, ...args);
const logWarn = (msg: string, ...args: any[]) =>
  console.warn(`[${new Date().toISOString()}] [WARN] ${msg}`, ...args);
const logError = (msg: string, ...args: any[]) =>
  console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, ...args);

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
  options?: { onTool?: (e: ToolLogEvent) => void; forceGetTime?: boolean },
) {
  const MAX_STEPS = 3;
  let msgs = [...messagesForAPI];

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: msgs,
      tools: [
        TOOL_GENERATE_BOOK_URL,
        TOOL_GET_DATETIME,
        TOOL_CAL_GET_SLOTS,
        TOOL_CAL_GET_SCHEDULES,
        TOOL_CAL_GET_EVENT_TYPES,
      ],
      tool_choice: options?.forceGetTime
        ? { type: "function", function: { name: "get_datetime" } }
        : "auto",
    });

    const choice = completion.choices?.[0]?.message;
    if (!choice) return { type: "final", content: "No response." } as const;

    const calls = choice.tool_calls;
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
            msgs.push({
              role: "tool",
              tool_call_id: tc.id,
              name: fn ?? "unknown",
              content: JSON.stringify({ error: `Unknown tool: ${fn}` }),
            });
          }
        } catch (err) {
          options?.onTool?.({
            source: "cal",
            phase: "error",
            name: fn ?? "unknown",
            args,
            error: String(err),
          });
          msgs.push({
            role: "tool",
            tool_call_id: tc.id,
            name: fn ?? "unknown",
            content: JSON.stringify({
              error: "Tool execution error",
              detail: String(err),
            }),
          });
        }
      }
      continue; // let the model read tool outputs and produce a final reply
    }

    if (choice.content?.trim()) {
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
  sendFn: (text: string) => Promise<void> | void,
  opts?: { onTool?: (e: ToolLogEvent) => void },
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
        address: "Calle Falsa 123",
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
      url = `${url}${sep}attendeePhoneNumber=+${encodeURIComponent(phone)}`;
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
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logInfo(`Using WA version ${version.join(".")}, isLatest: ${isLatest}`);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const sock = makeWASocket({ version, auth: state });

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  async function humanSend(
    to: string,
    text: string,
    // Buttons are optional and may be unsupported in some library versions
    buttons?: {
      buttonId: string;
      buttonText: { displayText: string };
      type: number;
    }[],
  ) {
    // Subscribe to presence updates and indicate typing
    try {
      await sock.presenceSubscribe(to);
    } catch {}
    try {
      await sock.sendPresenceUpdate('composing', to);
    } catch {}
    await sleep(800);
    try {
      if (buttons?.length) {
        // Best-effort: if unsupported, fall back to plain text
        await sock.sendMessage(to, {
          text,
          footer: "Por favor selecciona una opción:",
          buttons,
          headerType: 1,
        });
      } else {
        await sock.sendMessage(to, { text });
      }
    } catch {
      await sock.sendMessage(to, { text }); // fallback
    }
    // Indicate typing stopped
    try {
      await sock.sendPresenceUpdate('paused', to);
    } catch {}
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update as any;
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
          sseClients.forEach(client => client.write(`event: qr\ndata: ${dataUrl}\n\n`));
        } catch {}
      } catch (err) {
        logError("Failed to generate QR code", err);
      }
    }
    if (connection === "close") {
      const status = (lastDisconnect?.error as any)?.output?.statusCode;
      if (status !== DisconnectReason.loggedOut) startWhatsAppBot();
      else logError("Logged out. Please delete auth_info and restart.");
      // notify status to web UI
      sseClients.forEach(client => client.write(`event: status\ndata: close\n\n`));
    } else if (connection === "open") {
      logInfo("Connected to WhatsApp");
      // notify status to web UI
      sseClients.forEach(client => client.write(`event: status\ndata: open\n\n`));
    }
  });

  sock.ev.on("connection.error", (err) =>
    logError("Socket connection error:", err),
  );
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

    await handleIncomingMessage(from, remoteNumber, text, async (reply) => {
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

  const cliToolLogger = (e: ToolLogEvent) => {
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
    // start web UI server
    startWebServer();
    await startWhatsAppBot();
  }
})();
