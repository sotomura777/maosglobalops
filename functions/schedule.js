// Explicit Portuguese time zones; never interpret a shift in the browser/server zone.
export const zoneFor = (district) =>
  district === "Açores"
    ? "Atlantic/Azores"
    : district === "Madeira"
      ? "Atlantic/Madeira"
      : "Europe/Lisbon";
const partsAt = (ms, zone) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(ms)
      .map((p) => [p.type, p.value]),
  );
function localInstant(date, time, zone) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const base = Date.UTC(y, m - 1, d, h, min);
  if (new Date(base).toISOString().slice(0, 10) !== date)
    throw new Error("A data indicada não existe.");
  const candidates = [];
  // Supported Portuguese zones use whole-hour UTC offsets. Reject nonexistent or
  // ambiguous wall times at DST transitions instead of silently shifting the work.
  for (let offset = -2; offset <= 2; offset++) {
    const ms = base - offset * 3600000;
    const p = partsAt(ms, zone);
    if (
      `${p.year}-${p.month}-${p.day}` === date &&
      `${p.hour}:${p.minute}` === time
    )
      candidates.push(ms);
  }
  if (candidates.length !== 1)
    throw new Error(
      "Esse horário coincide com a mudança de hora. Escolhe um horário sem ambiguidade.",
    );
  return candidates[0];
}
export function scheduleOf(job) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(job.date || "") ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(job.startTime || "") ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(job.endTime || "") ||
    job.startTime === job.endTime
  )
    throw new Error(
      "Indica uma data válida e horas de início e fim diferentes.",
    );
  const zone = zoneFor(job.district);
  const startMs = localInstant(job.date, job.startTime, zone);
  const endDate =
    job.endTime < job.startTime
      ? new Date(Date.parse(job.date + "T12:00:00Z") + 86400000)
          .toISOString()
          .slice(0, 10)
      : job.date;
  const endMs = localInstant(endDate, job.endTime, zone);
  if (endMs <= startMs || endMs - startMs > 25 * 3600000)
    throw new Error("O horário não é válido.");
  return { startMs, endMs, timeZone: zone };
}
export const overlaps = (a, b) => a.startMs < b.endMs && b.startMs < a.endMs;
// Cancelar um trabalho confirmado a menos de 24h do início conta como cancelamento tardio.
export const LATE_CANCEL_MS = 24 * 3600000;
export const isLateCancellation = (startMs, now) =>
  Number.isFinite(startMs) && startMs - now < LATE_CANCEL_MS;
