/**
 * Formatea una fecha ISO de nota como "5 de noviembre de 2026, 14:32".
 * Devuelve `null` si no hay fecha o no es válida.
 * `timeZone` existe para los tests; en la app se usa la zona del dispositivo.
 */
export const formatNoteDate = (
  iso: string | undefined,
  timeZone?: string,
): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Describe cuánto pasó desde una fecha ISO: "recién", "hace 5 minutos",
 * "hace 2 horas", "ayer", "hace 3 días" o, desde la semana, "el 5 nov"
 * (con año si no es el actual). Devuelve `null` si no hay fecha o no es válida.
 * `now` y `timeZone` existen para los tests.
 */
export const formatRelativeNoteDate = (
  iso: string | undefined,
  now: number = Date.now(),
  timeZone?: string,
): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  // Una fecha apenas en el futuro (relojes desfasados) cuenta como "recién"
  const elapsed = Math.max(0, now - date.getTime());
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (elapsed < MINUTE) return "recién";
  if (elapsed < HOUR) return rtf.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return rtf.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < 7 * DAY) return rtf.format(-Math.floor(elapsed / DAY), "day");

  const sameYear =
    new Intl.DateTimeFormat("es", { year: "numeric", timeZone }).format(date) ===
    new Intl.DateTimeFormat("es", { year: "numeric", timeZone }).format(now);
  const day = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
    timeZone,
  }).format(date);
  return `el ${day}`;
};
