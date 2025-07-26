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
const ALLOWED_NUMBERS = ["+584242392804", "+584242479230"].map((n) =>
  n.replace(/^\+/, ""),
);

// System prompt
const SYSTEM_PROMPT =
  "Eres un asistente para una odontóloga que ayuda a pedir cita de forma cercana y fácil de entender. " +
  "Habla en español sencillo y claro, con un tono amable y natural, sin usar palabras complicadas. " +
  "Tu misión es conseguir rápido la fecha, la hora, el nombre del paciente y el servicio que desea. " +
  "Haz preguntas simples como “¿Qué día te viene bien?”, “¿A qué hora prefieres tu cita?” o “¿Cómo te llamas?”. " +
  "Si la conversación se va por otro lado, redirige con cortesía a la programación de la cita. " +
  "Más adelante podrás dar detalles de ubicación, precios, servicios o el equipo de la clínica cuando haga falta; por ahora, concéntrate en conseguir la cita. " +
  "No uses jerga médica, mantén todo simple y directo. ";

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
const TOOL_CREATE_APPT = {
  type: "function",
  function: {
    name: "create_appointment",
    description: "Create a dental appointment record",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Fecha de la cita YYYY-MM-DD" },
        time: { type: "string", description: "Hora HH:MM (24h)" },
        name: { type: "string", description: "Nombre completo del cliente" },
        service: { type: "string", description: "Tipo de servicio dental" },
      },
      required: ["date", "time", "name", "service"],
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
async function runAgent(messagesForAPI: ChatMessage[]) {
  const MAX_STEPS = 3;
  let msgs = [...messagesForAPI];

  for (let step = 0; step < MAX_STEPS; step++) {
    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: msgs,
      tools: [TOOL_CREATE_APPT, TOOL_GET_DATETIME],
      tool_choice: "auto",
    });

    const choice = completion.choices?.[0]?.message;
    if (!choice) return { type: "final", content: "No response." } as const;

    const toolCalls = choice.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      // IMPORTANT: first append the assistant message that contains tool_calls
      msgs.push(choice);

      // For each tool call, execute locally and append a paired tool message
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        const rawArgs = tc.function?.arguments || "{}";

        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(rawArgs);
        } catch {
          parsedArgs = {};
        }

        try {
          if (fnName === "get_datetime") {
            const info = getNowInfo({
              timezone: parsedArgs?.timezone,
              locale: parsedArgs?.locale,
            });
            msgs.push({
              role: "tool",
              tool_call_id: tc.id,
              // `name` is recommended/accepted with Tools API
              name: fnName,
              content: JSON.stringify(info),
            });
          } else if (fnName === "create_appointment") {
            // Let caller persist the side effect
            return {
              type: "function",
              name: "create_appointment",
              arguments: rawArgs,
            } as const;
          } else {
            msgs.push({
              role: "tool",
              tool_call_id: tc.id,
              name: fnName ?? "unknown_tool",
              content: JSON.stringify({ error: `Unknown tool: ${fnName}` }),
            });
          }
        } catch (err) {
          msgs.push({
            role: "tool",
            tool_call_id: tc.id,
            name: fnName ?? "unknown_tool",
            content: JSON.stringify({
              error: "Tool execution error",
              detail: String(err),
            }),
          });
        }
      }

      // Continue the loop so the model can see tool outputs and produce a final reply
      continue;
    }

    // No tool calls -> final assistant response
    if (choice.content?.trim()) {
      return { type: "final", content: choice.content.trim() } as const;
    }
  }

  return {
    type: "final",
    content: "Continuemos: ¿qué día y horario prefieres para tu cita?",
  } as const;
}

// ========== SHARED MESSAGE HANDLER ==========
async function handleIncomingMessage(
  chatId: string,
  userVisibleSender: string, // phone for WA, label for CLI
  text: string,
  sendFn: (text: string) => Promise<void> | void,
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
    const ctxMsg: ChatMessage = {
      role: "system",
      content: JSON.stringify(ctx),
    };
    const promptMsg: ChatMessage = { role: "system", content: SYSTEM_PROMPT };
    const messagesForAPI: ChatMessage[] = [
      timeAnchorMsg,
      ctxMsg,
      promptMsg,
      ...history,
    ];

    const result = await runAgent(messagesForAPI);

    if (result.type === "function" && result.name === "create_appointment") {
      // Parse & persist appointment
      let parsed: Partial<Appointment> = {};
      try {
        parsed = JSON.parse(result.arguments || "{}");
      } catch {}
      const rawDate = (parsed.date || "").toLowerCase();
      const today = new Date();
      let dt = new Date(today);
      if (
        rawDate.includes("pasado mañana") ||
        rawDate.includes("pasado manana")
      )
        dt.setDate(dt.getDate() + 2);
      else if (
        rawDate.includes("mañana") ||
        rawDate.includes("manana") ||
        rawDate.includes("tomorrow")
      )
        dt.setDate(dt.getDate() + 1);
      else if (rawDate.includes("hoy") || rawDate.includes("today")) {
        /* today */
      } else {
        const iso = new Date(parsed.date || "");
        if (!isNaN(iso.getTime())) dt = iso;
      }
      const dateStr = dt.toISOString().split("T")[0];

      const rawTime = (parsed.time || "").toLowerCase();
      let timeStr = "";
      const m = rawTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      if (m) {
        let h = parseInt(m[1], 10);
        const mm = m[2] ? parseInt(m[2], 10) : 0;
        const ap = m[3];
        if (ap === "pm" && h < 12) h += 12;
        if (ap === "am" && h === 12) h = 0;
        timeStr = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
      } else if (/\d{1,2}:\d{2}/.test(rawTime)) {
        timeStr = rawTime;
      }

      const args: Appointment = {
        date: dateStr,
        time: timeStr,
        name: parsed.name || "",
        service: parsed.service || "",
        phone: userVisibleSender,
      };

      const list = appointments.get(chatId) || [];
      list.push(args);
      appointments.set(chatId, list);

      const ack = `Cita programada:\n- Fecha: ${args.date}\n- Hora: ${args.time}\n- Nombre: ${args.name}\n- Teléfono: ${args.phone}\n- Servicio: ${args.service}`;
      await sendFn(ack);

      history.push({ role: "assistant", content: ack });
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
    try {
      await sock.presenceSubscribe(to);
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
      } catch (err) {
        logError("Failed to generate QR code", err);
      }
    }
    if (connection === "close") {
      const status = (lastDisconnect?.error as any)?.output?.statusCode;
      if (status !== DisconnectReason.loggedOut) startWhatsAppBot();
      else logError("Logged out. Please delete auth_info and restart.");
    } else if (connection === "open") {
      logInfo("Connected to WhatsApp");
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
  const userLabel = "terminal";

  console.log(
    "CLI chat iniciado. Comandos: '/reset' reinicia contexto, '/tz <IANA>' cambia zona horaria, '/exit' sale.\n",
  );

  const sendFn = async (text: string) => {
    console.log(`\nAsistente: ${text}\n`);
  };

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
    await handleIncomingMessage(chatId, userLabel, user, sendFn);
  }

  await rl.close();
  console.log("CLI chat finalizado.");
}

// ========== ENTRYPOINT ==========
(async () => {
  const useCli = process.argv.includes("--cli");
  if (useCli) await startCliChat();
  else await startWhatsAppBot();
})();
