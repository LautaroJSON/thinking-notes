// Procesamiento de imágenes pegadas: detección en el portapapeles, validación
// y compresión en el cliente antes de guardarlas (research R5 y R6).

export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const MAX_SIDE_PX = 1600;
export const WEBP_QUALITY = 0.8;
export const JPEG_QUALITY = 0.85;

export const IMAGE_ERRORS = {
  notImage: "Solo se pueden pegar imágenes.",
  inputTooLarge: "La imagen supera el máximo de 20 MB.",
  outputTooLarge: "La imagen sigue pesando más de 2 MB después de comprimirla.",
  unreadable: "No se pudo leer la imagen.",
  tooMany: "Podés adjuntar hasta 5 imágenes por pensamiento.",
} as const;

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

type ClipboardLike = Pick<DataTransfer, "files" | "items" | "types">;

/**
 * Archivos pegados, separados en imágenes y otros archivos. Se leen de `files`
 * y, si está vacío, de `items` (algunos navegadores solo llenan uno de los dos).
 */
export const extractImageFiles = (
  data: ClipboardLike | null,
): { images: File[]; otherFiles: File[] } => {
  if (!data) return { images: [], otherFiles: [] };

  let files = Array.from(data.files ?? []);
  if (files.length === 0) {
    files = Array.from(data.items ?? [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
  }

  const images: File[] = [];
  const otherFiles: File[] = [];
  for (const file of files) {
    (file.type.startsWith("image/") ? images : otherFiles).push(file);
  }
  return { images, otherFiles };
};

/** Si el portapapeles trae texto (para dejar que se pegue como siempre). */
export const hasClipboardText = (data: ClipboardLike | null): boolean =>
  !!data &&
  Array.from(data.types ?? []).some(
    (type) => type === "text/plain" || type === "text/html",
  );

/** Tamaño final: el lado mayor no supera `maxSide` y nunca se agranda. */
export const computeTargetSize = (
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } => {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/**
 * Formato a usar cuando el navegador no sabe codificar WebP (Safari):
 * PNG si el original es PNG y liviano (conserva la transparencia), si no JPEG.
 */
export const chooseFallbackFormat = (
  originalType: string,
  originalSize: number,
): "image/png" | "image/jpeg" =>
  originalType === "image/png" && originalSize <= MAX_OUTPUT_BYTES
    ? "image/png"
    : "image/jpeg";

/** Mensaje de error si el archivo no se puede aceptar; `null` si está bien. */
export const validateInputFile = (file: File): string | null => {
  if (!file.type.startsWith("image/")) return IMAGE_ERRORS.notImage;
  if (file.size > MAX_INPUT_BYTES) return IMAGE_ERRORS.inputTooLarge;
  return null;
};

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
}

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError(IMAGE_ERRORS.unreadable);
  return { canvas, ctx };
};

/**
 * Reduce la imagen a MAX_SIDE_PX y la codifica en WebP (o PNG/JPEG si el
 * navegador no soporta WebP). `createImageBitmap` aplica la orientación EXIF y,
 * en los GIF animados, toma el primer cuadro.
 */
export const compressImage = async (file: File): Promise<CompressedImage> => {
  const inputError = validateInputFile(file);
  if (inputError) throw new ImageProcessingError(inputError);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageProcessingError(IMAGE_ERRORS.unreadable);
  }

  const { width, height } = computeTargetSize(
    bitmap.width,
    bitmap.height,
    MAX_SIDE_PX,
  );
  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (!blob || blob.type !== "image/webp") {
    const fallback = chooseFallbackFormat(file.type, file.size);
    if (fallback === "image/png") {
      blob = await canvasToBlob(canvas, "image/png");
    } else {
      // JPEG no tiene transparencia: se pinta un fondo blanco debajo
      const flat = createCanvas(width, height);
      flat.ctx.fillStyle = "#ffffff";
      flat.ctx.fillRect(0, 0, width, height);
      flat.ctx.drawImage(canvas, 0, 0);
      blob = await canvasToBlob(flat.canvas, "image/jpeg", JPEG_QUALITY);
    }
  }

  if (!blob) throw new ImageProcessingError(IMAGE_ERRORS.unreadable);
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new ImageProcessingError(IMAGE_ERRORS.outputTooLarge);
  }
  return { blob, width, height };
};

/** Extensión de archivo según el tipo MIME de la imagen comprimida. */
export const extensionForType = (type: string): "webp" | "png" | "jpg" =>
  type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : "webp";
