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
