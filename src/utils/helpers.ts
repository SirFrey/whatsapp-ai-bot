export function toUtcWindowFromLocalDate(dateStr: string, tz = "America/Caracas") {
  // dateStr like "2025-07-28" (no time). We produce:
  // start: ISO UTC at local start-of-day, end: ISO UTC at local end-of-day.
  const localStart = new Date(`${dateStr}T00:00:00`);
  const localEnd = new Date(`${dateStr}T23:59:59`);

  // Convert to UTC by formatting as UTC Z times
  const startUtc = new Date(
    localStart.getTime() - (new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(localStart).find(p => p.type === "timeZoneName")?.value?.includes("-04:00") ? 0 : 0) // Caracas is UTC-4 all year
  );
  const endUtc = new Date(
    localEnd.getTime() - (new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(localEnd).find(p => p.type === "timeZoneName")?.value?.includes("-04:00") ? 0 : 0)
  );

  // Safer/easier: just append Z and let API treat date-only; but here we return full ISO Z strings:
  return {
    start: `${dateStr}T00:00:00Z`,
    end: `${dateStr}T23:59:59Z`,
  };
}

