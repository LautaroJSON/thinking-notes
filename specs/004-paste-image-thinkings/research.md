# Research: Pegar imágenes como pensamientos de una nota

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-06

Cada decisión resuelve una incógnita del contexto técnico. Formato: Decisión / Razón /
Alternativas descartadas.

---

## R1. Forma del pensamiento en el código (unión discriminada)

**Decisión**: `Thinking = TextThinking | ImageThinking | UnknownThinking` en
`src/types/thinking.ts`:

- `TextThinking = { id: string; type: "text"; value: string }`
- `ImageThinking = { id: string; type: "image"; value: ImageRef[]; text?: string }` con
  `value.length` entre 1 y 5.
- `UnknownThinking = { id: string; type: string; [k: string]: unknown }`: se conserva tal
  cual (FR-025) y la UI lo muestra como "Contenido no soportado en esta versión".

Toda entrada externa (localStorage, respuesta de la API) pasa por `parseThinkings(unknown)`,
que valida y devuelve tipos concretos, sin `any` (principio IV).

**Razón**: respeta el contrato decidido (`{ id, type, value, text? }`) y deja que
TypeScript fuerce el manejo de cada tipo en render, búsqueda, copia y exportación.

**Alternativas**: `{ id, text?, images? }` sin `type` (se aleja del contrato y no escala a
audio o enlaces); `value: string` con varias referencias separadas por comas (frágil).

## R2. Referencias a imágenes: local vs nube

**Decisión**: la referencia es un string con prefijo explícito:

- Local (sin sesión): `local:<uuid>` → clave en IndexedDB.
- Nube (con sesión): `<userId>/<noteId>/<uuid>.<ext>` → ruta en el bucket privado
  `thinking-images`.

`resolveImageStore(ref)` elige el almacenamiento por el prefijo, no por el modo actual.

**Razón**: hoy la app copia notas remotas a `localStorage` (al borrar en modo online y
como respaldo si falla `GET /notes`), así que una nota local puede tener referencias
remotas. El prefijo evita adivinar. La carpeta por nota (`<noteId>/`) permite borrar o
limpiar todas las imágenes de una nota con un solo listado.

**Alternativas**: inferir el almacenamiento por `isLogged` (falla con los datos copiados);
ruta plana `<userId>/<uuid>` (para limpiar una nota habría que cruzar todas las referencias).

## R3. Almacenamiento local: IndexedDB sin librería

**Decisión**: wrapper propio de unas 60 líneas (`src/services/images/localImageStore.ts`)
sobre la API nativa de IndexedDB. Base `thinking-notes-images`, object store `images`,
clave = uuid, valor = `{ data: ArrayBuffer, type: string, createdAt: number }` (se guarda el contenido y no el `Blob`, por compatibilidad entre navegadores). Operaciones: `put`, `get`,
`delete`, `keys`. Para los tests se suma la devDependency `fake-indexeddb`, porque jsdom no
trae IndexedDB.

**Razón**: el uso es mínimo (clave → Blob). Una librería como `idb`/`idb-keyval` ahorra
poco código y suma una dependencia en runtime (principio V).

**Alternativas**: `idb-keyval` (~600 B, aceptable pero innecesaria); Cache API (pensada
para respuestas HTTP, más incómoda para Blobs con metadatos); base64 en localStorage
(prohibido por FR-009 y limitado a unos 5 MB).

## R4. Almacenamiento con sesión: Supabase Storage desde el frontend

**Decisión**: bucket privado `thinking-images`, creado por SQL versionado en el backend
(`prisma/sql/003-storage-thinking-images.sql`):

- `public = false`, `file_size_limit = 2 MB` y `allowed_mime_types = image/webp,
  image/jpeg, image/png`. Así el límite se aplica también en el servidor.
- Políticas RLS en `storage.objects` para `select`, `insert` y `delete`, restringidas a
  `bucket_id = 'thinking-images'` y `(storage.foldername(name))[1] = auth.uid()::text`.
  No hay política de `update`: los archivos no se reemplazan (`upsert: false`).
- La subida, el borrado y las URLs firmadas se hacen con el cliente `supabase` existente
  y la sesión del usuario, desde `src/services/images/remoteImageStore.ts`.
- La app muestra las imágenes con `createSignedUrls` en lote (una llamada por nota), con
  vencimiento de 1 h, y las guarda en memoria. Si a una URL le quedan menos de 5 minutos,
  se pide de nuevo.

**Razón**: es lo decidido por el usuario. RLS garantiza el aislamiento por usuario
(FR-012) sin pasar los binarios por la API NestJS. Las URLs firmadas cumplen FR-013.

**Alternativas**: subir a través de la API NestJS (duplica el tráfico y requiere manejar
multipart); bucket público con nombres impredecibles (viola FR-013).

## R5. Compresión en el cliente

**Decisión**: `src/components/utils/imageProcessing.ts` con funciones puras más un paso
con canvas:

1. Rechazar si `file.size > 20 MB` o si `!file.type.startsWith("image/")`.
2. `createImageBitmap(file)`: aplica la orientación EXIF y, en GIF, toma el primer cuadro.
3. `computeTargetSize(w, h, 1600)` (pura): escala para que el lado mayor sea ≤ 1600 px y
   nunca agranda.
4. Dibujar en un canvas (`OffscreenCanvas` si está disponible) y exportar con
   `toBlob("image/webp", 0.8)`.
5. Si el navegador no codifica WebP (el blob vuelve con otro `type`, como pasa en Safari):
   usar PNG si el original es PNG y pesa ≤ 2 MB (conserva la transparencia); si no, JPEG
   con calidad 0.85.
6. Rechazar si el resultado pesa más de 2 MB.

Las constantes (`MAX_INPUT_BYTES`, `MAX_OUTPUT_BYTES`, `MAX_SIDE_PX`,
`MAX_IMAGES_PER_THINKING = 5`) quedan en un solo módulo.

**Razón**: con WebP 0.8 a 1600 px, una captura de 1920×1080 pesa unos 100–300 KB
(SC-003). Comprimir al pegar (no al enviar) permite mostrar los errores en el momento y
que la vista previa sea exactamente lo que se guarda.

**Alternativas**: `browser-image-compression` (~50 KB, más de lo necesario); guardar el
original (de 2 a 10 MB por captura de pantalla retina).

## R6. Detección del pegado

**Decisión**: `onPaste` en el `textarea` de nuevo pensamiento. La función pura
`extractImageFiles(DataTransfer)` lee `clipboardData.files` (y como respaldo `items`
con `kind === "file"`) y filtra por `image/*`. Si encuentra imágenes, llama a
`preventDefault()` y no pega texto; si no, no hace nada y el pegado de texto sigue igual
(FR-003).

**Razón**: es el mecanismo estándar y funciona con Ctrl/Cmd+V y con "Pegar" del menú
contextual. Chrome/Android entrega como archivo la imagen copiada desde el portapapeles de
Gboard.

**Limitación conocida**: en iOS Safari, el menú "Pegar" de un `textarea` puede no aparecer
cuando el portapapeles solo tiene una imagen. Adjuntar con un selector de archivos está
fuera de alcance (spec, Preguntas Abiertas); se documenta en la verificación manual.

**Alternativas**: `navigator.clipboard.read()` con un botón "Pegar imagen" (pide permisos,
no funciona en Firefox y agrega UI).

## R7. Flujo de guardado y consistencia (sin huérfanos)

**Decisión**:

- **Al confirmar** con imágenes en la vista previa:
  1. Subir o guardar todas en paralelo (`Promise.allSettled`).
  2. Si alguna falla: borrar las que sí se guardaron (si eso falla, van a la cola de
     pendientes), mostrar el error y dejar la vista previa intacta (FR-014 y FR-015).
  3. Si todas se guardan: agregar el `ImageThinking` a la nota y forzar un guardado
     inmediato (`flushSave`), sin esperar el debounce de 2 s, para acortar la ventana en
     la que hay archivos sin nota que los referencie.
- **Al borrar** un pensamiento, quitar imágenes al editar o borrar una nota: las
  referencias que salen van a una cola persistente de borrados pendientes
  (`localStorage["pendingImageDeletions"]`).
- **La cola se procesa** después de cada guardado exitoso de la nota, al iniciar la app y
  al cambiar de sesión. Antes de borrar una referencia, se verifica que ninguna nota
  cargada la siga usando. Así, si el guardado de la nota falla, nunca se borra un archivo
  que la nota todavía referencia. Las referencias remotas solo se procesan con sesión.
- **Limpieza de respaldo**:
  - Local, al iniciar la app: se borran las claves de IndexedDB que ninguna nota local
    referencia y tienen más de 10 minutos. El margen evita interferir con una subida en
    curso.
  - Nube, al abrir una nota con sesión: se lista `<userId>/<noteId>/` (una sola llamada) y
    se borran los archivos que la nota no referencia y tienen más de 10 minutos.
  - Al borrar una nota con sesión, además se listan y borran todos los archivos de
    `<userId>/<noteId>/`.

**Razón**: cubre SC-004 aunque la red falle o se cierre la pestaña. La verificación de que
nadie use la referencia hace que la cola sea segura aunque se procese desordenada o dos
veces.

**Alternativas**:

- Borrar archivos desde el backend al recibir el `PUT` (usando la service role que ya
  tiene el guard). Es robusto en modo online, pero hay que duplicar la lógica para el
  modo offline y el borrado post-commit también puede fallar.
- Borrar en el momento, sin cola (deja huérfanos si no hay red).

## R8. Visor ampliado (lightbox)

**Decisión**: componente `ImageViewer` sobre `<dialog>` nativo con `showModal()`. Trae
gratis el foco atrapado, el cierre con Escape y el fondo (`::backdrop`). Además:

- cierra al hacer clic en el backdrop;
- botones anterior/siguiente y flechas ←/→;
- deslizar en táctil con eventos de puntero (umbral de 50 px).

**Razón**: no suma dependencias, es accesible por defecto y es compatible con los
navegadores objetivo.

**Alternativas**: `yet-another-react-lightbox` (~20 KB gzip, más funciones de las que hacen
falta).

## R9. Exportación a PDF

**Decisión**: `downloadNoteAsPdf` pasa a recibir un `getImageBlob(ref)` inyectado. Para
cada imagen:

1. Decodificar con `createImageBitmap`.
2. Dibujar en un canvas con fondo blanco y exportar con `toDataURL("image/jpeg", 0.85)`.
3. `doc.addImage` al ancho útil, conservando la proporción, con salto de página si hace
   falta. Si una sola imagen es más alta que la página, se escala para que entre.

Si falla, se escribe "[Imagen no disponible]" y sigue (FR-029). Copiar y exportar a
Markdown usan "[Imagen]" y no necesitan los blobs (FR-030).

**Razón**: convertir a JPEG evita depender del soporte de WebP de jsPDF y da PDFs livianos.

**Alternativas**: pasar el WebP directo a `addImage` (el soporte varía entre versiones y
navegadores); omitir las imágenes (cumple lo mínimo pero empeora la funcionalidad).

## R10. Migración de datos

**Decisión**:

- **Local**: `loadNotesFromStorage` normaliza `thinkings` con `parseThinkings`. Cada string
  se convierte en `{ id: uuidv4(), type: "text", value: s }` y los objetos válidos pasan
  sin cambios (es idempotente). Si hubo cambios, se reescribe `localStorage` una vez.
- **Remota**: SQL versionado `prisma/sql/002-content-list-typed.sql`. Convierte cada
  elemento string de `content_list` en `{"id": gen_random_uuid(), "type": "text",
  "value": <s>}` con `jsonb_array_elements ... WITH ORDINALITY`, conservando el orden.
  Solo toca filas que tienen algún elemento string (idempotente) y se corre una vez antes
  de desplegar el backend nuevo.
- **Sin compatibilidad hacia atrás** (aclaración 5): la API rechaza `contentList` de
  strings con 400, y el frontend no acepta strings en las respuestas remotas.

## R11. Validación en el backend

**Decisión**: función pura `parseContentList(input: unknown, ctx: { userId; noteId? })` en
`src/notes/content-list.ts`, usada en `create` y `updateById`. El backend no tiene
`ValidationPipe` global, así que los DTO de class-validator no se aplican (igual que en
`reorder`). Reglas:

- Tiene que ser un array de objetos, con ids no vacíos y únicos dentro de la nota.
- `text`: `value` es string; no lleva `text`.
- `image`: `value` es un array de 1 a 5 strings únicos, cada uno con el formato
  `^<userId>/<noteId>/<uuid>\.(webp|jpg|png)$`; `text` es opcional y string.
- En `create` no se aceptan imágenes, porque todavía no existe la carpeta de la nota.
- Otros tipos: se aceptan si tienen `id` y `type` strings, y se guardan tal cual (FR-025).
- Si algo no cumple, responde 400 con un mensaje en español.

**Razón**: FR-028 y la defensa en profundidad. Aunque RLS impide leer archivos ajenos, la
API no debe guardar referencias a carpetas de otro usuario.

## R12. Estado de carga y errores en la UI

**Decisión**:

- Nuevo `WaitingResponseType` `"uploadingImages"`.
- Mientras se sube, el botón de enviar queda deshabilitado con spinner y el estado de
  guardado muestra "Guardando…".
- Los errores se muestran en línea sobre la vista previa (`role="alert"`), con mensajes
  fijos en español:
  - "La imagen supera el máximo de 20 MB."
  - "La imagen sigue pesando más de 2 MB después de comprimirla."
  - "Solo se pueden pegar imágenes."
  - "Podés adjuntar hasta 5 imágenes por pensamiento."
  - "No se pudo subir la imagen. Revisá tu conexión e intentá de nuevo."
  - "No hay espacio suficiente en el navegador para guardar la imagen."
    (`QuotaExceededError`).

**Razón**: principio II (estados visibles, sin fallar en silencio).
