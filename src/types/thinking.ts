import { v4 as uuidv4 } from "uuid";

/** Máximo de imágenes que puede tener un pensamiento. */
export const MAX_IMAGES_PER_THINKING = 5;

/**
 * Referencia a un archivo de imagen, nunca el binario:
 * - `local:<uuid>` → IndexedDB (sin sesión)
 * - `<userId>/<noteId>/<uuid>.<ext>` → Supabase Storage (con sesión)
 */
export type ImageRef = string;

export interface TextThinking {
  id: string;
  type: "text";
  value: string;
}

export interface ImageThinking {
  id: string;
  type: "image";
  /** Entre 1 y MAX_IMAGES_PER_THINKING referencias, en orden. */
  value: ImageRef[];
  /** Texto que acompaña a las imágenes (opcional). */
  text?: string;
}

/** Tipo creado por una versión futura: se conserva sin modificarlo. */
export interface UnknownThinking {
  id: string;
  type: string;
  [key: string]: unknown;
}

export type Thinking = TextThinking | ImageThinking | UnknownThinking;

const LOCAL_PREFIX = "local:";

export const isLocalRef = (ref: ImageRef): boolean =>
  ref.startsWith(LOCAL_PREFIX);

export const toLocalRef = (key: string): ImageRef => `${LOCAL_PREFIX}${key}`;
export const fromLocalRef = (ref: ImageRef): string =>
  ref.slice(LOCAL_PREFIX.length);

export const isTextThinking = (t: Thinking): t is TextThinking =>
  t.type === "text" && typeof t.value === "string";

export const isImageThinking = (t: Thinking): t is ImageThinking =>
  t.type === "image" && Array.isArray(t.value);

/** Texto buscable/exportable del pensamiento ("" si no tiene). */
export const getThinkingText = (t: Thinking): string => {
  if (isTextThinking(t)) return t.value;
  if (isImageThinking(t)) return t.text ?? "";
  return "";
};

export const getImageRefs = (t: Thinking): ImageRef[] =>
  isImageThinking(t) ? t.value : [];

export const createTextThinking = (value: string): TextThinking => ({
  id: uuidv4(),
  type: "text",
  value,
});

/** Crea un pensamiento con imágenes; omite el texto si queda vacío. */
export const createImageThinking = (
  refs: ImageRef[],
  text: string,
): ImageThinking => {
  const trimmed = text.trim();
  return {
    id: uuidv4(),
    type: "image",
    value: refs,
    ...(trimmed ? { text: trimmed } : {}),
  };
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

// Valida un elemento con forma de pensamiento. Devuelve null si es inválido.
const parseThinkingObject = (
  item: Record<string, unknown>,
): Thinking | null => {
  const { id, type } = item;
  if (!isNonEmptyString(id) || !isNonEmptyString(type)) return null;

  if (type === "text") {
    return typeof item.value === "string"
      ? { id, type: "text", value: item.value }
      : null;
  }

  if (type === "image") {
    const { value, text } = item;
    if (
      !Array.isArray(value) ||
      value.length < 1 ||
      value.length > MAX_IMAGES_PER_THINKING ||
      !value.every(isNonEmptyString) ||
      new Set(value).size !== value.length ||
      (text !== undefined && typeof text !== "string")
    ) {
      return null;
    }
    return {
      id,
      type: "image",
      value: [...value],
      ...(typeof text === "string" ? { text } : {}),
    };
  }

  // Tipo desconocido: se conserva entero
  return { ...item, id, type };
};

/**
 * Normaliza una lista de pensamientos que viene de afuera (localStorage o API).
 * Convierte el formato anterior (`string[]`) a pensamientos de texto, descarta
 * los elementos inválidos y garantiza ids únicos. `migrated` indica si hubo que
 * cambiar algo, para reescribir los datos guardados una sola vez.
 */
export const parseThinkings = (
  input: unknown,
): { thinkings: Thinking[]; migrated: boolean } => {
  if (!Array.isArray(input)) return { thinkings: [], migrated: false };

  const thinkings: Thinking[] = [];
  const seenIds = new Set<string>();
  let migrated = false;

  for (const item of input) {
    let thinking: Thinking | null = null;

    if (typeof item === "string") {
      thinking = createTextThinking(item);
      migrated = true;
    } else if (isRecord(item)) {
      thinking = parseThinkingObject(item);
    }

    if (!thinking) {
      console.warn("Pensamiento inválido descartado:", item);
      migrated = true;
      continue;
    }

    if (seenIds.has(thinking.id)) {
      thinking = { ...thinking, id: uuidv4() };
      migrated = true;
    }
    seenIds.add(thinking.id);
    thinkings.push(thinking);
  }

  return { thinkings, migrated };
};
