// ---- Cal.com HTTP Client ----
const CAL_BASE = process.env.CALCOM_API_BASE || "https://api.cal.com";
const CAL_VERSION = process.env.CALCOM_API_VERSION || "2024-09-04";
const CAL_KEY = process.env.CALCOM_API_KEY;

if (!CAL_KEY) {
  console.error("Missing CALCOM_API_KEY in environment.");
  process.exit(1);
}

export async function calRequest(
  path: string,
  opts?: {
    query?: Record<string, string | number | boolean | undefined>;
    init?: RequestInit;
  },
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(opts?.query || {})) {
    if (v !== undefined && v !== null) q.set(k, String(v));
  }
  const url = `${CAL_BASE}${path}${q.toString() ? `?${q.toString()}` : ""}`;
  const res = await fetch(url, {
    ...opts?.init,
    headers: {
      Authorization: `Bearer ${CAL_KEY}`,
      "cal-api-version": CAL_VERSION,
      "Content-Type": "application/json",
      ...(opts?.init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Cal.com ${res.status}: ${txt || res.statusText}`);
  }
  return res.json(); // Cal.com v2 responses typically wrap data under { status, data }
}

export type ToolLogEvent = {
  source: "cal" | "time" | "appt";
  phase: "call" | "result" | "error";
  name: string;
  args?: any;
  resultSummary?: string;
  error?: string;
};

export function summarizeCalResult(fn: string, data: any): string {
  try {
    if (fn === "cal_get_slots") {
      const len = data?.data?.slots?.length ?? data?.slots?.length ?? 0;
      return `slots=${len}`;
    }
    if (fn === "cal_get_schedules") {
      const count = data?.data?.length ?? data?.length ?? 0;
      const tz =
        data?.data?.[0]?.timeZone ??
        data?.timeZone ??
        data?.data?.timeZone ??
        "";
      return `schedules=${count}${tz ? ` tz=${tz}` : ""}`;
    }
    if (fn === "cal_get_event_types") {
      const len = data?.data?.length ?? data?.length ?? 0;
      return `eventTypes=${len}`;
    }
  } catch {
    // ignore
  }
  return "ok";
}

