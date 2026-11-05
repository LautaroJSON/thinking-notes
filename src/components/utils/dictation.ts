// Funciones puras para combinar el texto dictado con el borrador del campo.

const endsWithSeparator = (text: string) => /\s$/.test(text);

/** Agrega un fragmento dictado al final del texto, separado por un espacio si hace falta. */
export const appendTranscript = (base: string, chunk: string): string => {
  const clean = chunk.trim();
  if (!clean) return base;
  if (!base || endsWithSeparator(base)) return base + clean;
  return `${base} ${clean}`;
};

/** Texto que se muestra en el campo: borrador + provisorio en curso. */
export const composeDraft = (draft: string, interim: string): string =>
  appendTranscript(draft, interim);

/**
 * Saca el provisorio del final de lo que hay en el campo, para que al tipear
 * no quede duplicado cuando llegue el resultado final.
 */
export const stripInterim = (value: string, interim: string): string => {
  const suffix = interim.trim();
  if (!suffix || !value.endsWith(suffix)) return value;
  const rest = value.slice(0, value.length - suffix.length);
  return rest.endsWith(" ") ? rest.slice(0, -1) : rest;
};
