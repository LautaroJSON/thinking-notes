---
description: "Lista de tareas para pegar imágenes como pensamientos de una nota"
---

# Tareas: Pegar imágenes como pensamientos de una nota

**Input**: Documentos de diseño en `specs/004-paste-image-thinkings/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: se incluyen porque el principio III de la constitución exige tests de Vitest
para toda lógica nueva o modificada (tipos y parsers, servicios, contexto, utilidades),
en los dos modos. El backend usa Jest. La UI se verifica a mano según
[quickstart.md](./quickstart.md).

**Organización**: las tareas están agrupadas por historia de usuario. El orden de las
fases no es el de prioridad: primero se hace todo el flujo sin sesión (US1–US3), después
la migración remota (US5), después el modo con sesión (US4) y al final la exportación
(US6).

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes).
- **[Story]**: historia de la spec a la que pertenece (US1 a US6).

## Convenciones de rutas

- **Frontend** (este repo): `src/…` desde la raíz de `thinking-notes`.
- **Backend** (repo hermano): `../thinking-notes-backend/…`.
- Las constantes, los mensajes y las reglas están en [data-model.md](./data-model.md) y en
  research R12. Las tareas los referencian en lugar de repetirlos.

---

## Fase 1: Setup

**Propósito**: ramas y dependencias de test.

- [X] T001 Crear la rama `feat/paste-image-thinkings` desde `main` actualizado en este repo y la rama `feat/typed-content-list` en `../thinking-notes-backend`
- [X] T002 Instalar la devDependency de tests de IndexedDB: `npm install -D fake-indexeddb` (justificación en el plan, principio V). Verificar que `package.json` no suma dependencias de runtime
- [X] T003 [P] Anotar el tamaño gzip del chunk principal de `npm run build` en main, para compararlo en T064. El objetivo es no sumar dependencias de runtime; el código nuevo debería sumar menos de 10 kB gzip

---

## Fase 2: Fundacional (bloquea todas las historias)

**Propósito**: pasar de `string[]` a `Thinking[]` sin perder funcionalidad. Al terminar,
la app sin sesión funciona igual que antes con el formato nuevo, incluida la migración
local, que es la parte local de US5.

**⚠️ CRÍTICO**: ninguna historia empieza hasta terminar esta fase.

- [X] T004 [P] Escribir tests en `src/types/thinking.test.ts` para `parseThinkings(input: unknown): { thinkings: Thinking[]; migrated: boolean }`:
  - un string `s` pasa a `{ id: <uuid v4>, type: "text", value: s }` con `migrated: true`;
  - los objetos `text` e `image` válidos pasan sin cambios (`migrated: false`) y es idempotente (parsear dos veces da lo mismo);
  - conserva el orden;
  - un tipo desconocido con `id`/`type` string se conserva tal cual;
  - descarta elementos inválidos (`null`, números, objetos sin `id`, `image` con 0 o más de 5 refs) y los registra con `console.warn`;
  - un input que no es array devuelve `[]`;
  - ids repetidos: el segundo recibe un id nuevo.
- [X] T005 Crear `src/types/thinking.ts`:
  - tipos `ImageRef = string`, `TextThinking`, `ImageThinking` (`value: ImageRef[]`, `text?: string`), `UnknownThinking` y `Thinking` (unión);
  - type guards `isTextThinking`, `isImageThinking`;
  - helpers `isLocalRef(ref)` (prefijo `local:`), `getThinkingText(t)` (el `value` del de texto, el `text` del de imagen y `""` en otros tipos) y `getImageRefs(t)`;
  - `parseThinkings` hasta que pasen los tests de T004, sin `any` y usando `uuid` v4.

  Re-exportar los tipos desde `src/types/index.ts`.
- [X] T006 En `src/types/index.ts`: cambiar `INotes.thinkings` a `Thinking[]` y agregar `"uploadingImages"` a `WaitingResponseType`
- [X] T007 [P] Escribir tests de migración local en `src/components/utils/index.test.ts`:
  - `loadNotesFromStorage` con `thinkings: string[]` devuelve objetos `text` y reescribe `localStorage["notes"]` una sola vez;
  - con datos ya migrados no llama a `setItem`;
  - con JSON inválido devuelve `[]` como hoy.
- [X] T008 Actualizar `loadNotesFromStorage` en `src/components/utils/index.ts` para normalizar cada nota con `parseThinkings`, y reescribir `localStorage` si alguna nota tuvo `migrated: true` (pasa T007)
- [X] T009 [P] Cambiar `RemoteNote.contentList`, `NoteResponse.contentList`, `NoteCreatePayload` y `NoteUpdatePayload` a `Thinking[]` en `src/services/service.ts`. En `getNotesService`, `createNoteService` y `updateNoteService`, pasar `contentList` por `parseThinkings` (es conversión explícita, principio IV). Ajustar `src/services/service.test.ts`
- [X] T010 Adaptar `src/components/notes/noteContent/components/activeNoteView.tsx` al nuevo tipo, solo para texto:
  - `handleNewThinking` crea `{ id: uuidv4(), type: "text", value }`;
  - la edición en línea actualiza `value` buscando por `id` (no por índice);
  - borrar filtra por `id`;
  - el render usa `key={thinking.id}` y por ahora muestra solo los `text`; los otros tipos los resuelve US2.
- [X] T011 [P] Adaptar `src/hooks/useNoteSearch.tsx` para buscar en `getThinkingText(t)` y devolver `thinkingId` además del índice. Actualizar los usos en `activeNoteView.tsx` y sumar casos de búsqueda en el texto que acompaña a las imágenes al test existente (o crear `src/hooks/useNoteSearch.test.ts`)
- [X] T012 [P] Adaptar `src/components/utils/copyNote.ts` y `noteToMarkdown`/`getThinkings` en `src/components/utils/exportNote.ts` para que, por ahora, usen `getThinkingText` solo en los `text`. Ajustar `copyNote.test.ts` y `exportNote.test.ts` a los nuevos datos de prueba. US6 completa la parte de imágenes
- [X] T013 Ajustar `src/context/notesContext.tsx` (mapeo de `contentList` ↔ `thinkings`, ya tipado) y `src/context/notesContext.test.tsx` (fixtures con `Thinking[]`). Correr `npm test` y `npm run build` en verde

**Checkpoint**: sin sesión, la app crea, edita, borra, busca, copia y exporta pensamientos
de texto como antes, y las notas viejas en localStorage se migran solas.

---

## Fase 3: Historia 1 – Pegar imágenes y guardarlas como pensamiento (P1) 🎯 MVP

**Objetivo**: sin sesión, pegar hasta 5 imágenes, verlas en la vista previa, quitarlas de a
una y enviarlas (con texto opcional) como un único pensamiento guardado en IndexedDB.

**Prueba independiente**: pegar 3 capturas, quitar una, escribir "prueba" y enviar. Queda
un pensamiento con 2 miniaturas y el texto, y sigue ahí después de recargar. Pegar texto
común funciona como antes.

### Tests de la Historia 1

- [X] T014 [P] [US1] Tests en `src/components/utils/imageProcessing.test.ts`:
  - `extractImageFiles(dataTransfer)`: devuelve solo los archivos `image/*` en orden, usa `items` con `kind === "file"` como respaldo y devuelve `[]` si solo hay texto o HTML;
  - `computeTargetSize(w, h, 1600)`: 3200×1800 → 1600×900, 1000×3000 → 533×1600, y 200×200 queda igual (no agranda);
  - `chooseFallbackFormat(originalType, originalSize)`: PNG ≤ 2 MB → `image/png`; si no, `image/jpeg`;
  - `validateInputFile`: rechaza lo que no es imagen y lo que pasa de 20 MB, con los mensajes de R12.
- [X] T015 [P] [US1] Tests en `src/services/images/localImageStore.test.ts`, con `import "fake-indexeddb/auto"`:
  - `save` devuelve `local:<uuid>` y guarda `{ blob, createdAt }`;
  - `getBlob` devuelve el mismo blob;
  - `remove` borra y no falla si la clave no existe;
  - `listAll()` devuelve claves y `createdAt`;
  - un `QuotaExceededError` simulado se propaga como `ImageStoreError` con `code: "quota"`.
- [X] T016 [P] [US1] Tests en `src/hooks/usePendingImages.test.ts`, con `compressImage` mockeado:
  - agrega en orden y respeta el máximo de 5 (avisa y descarta las que sobran);
  - `remove(localId)` quita solo esa imagen y revoca su URL;
  - `clear()` revoca todas;
  - si una imagen falla al comprimir, se rechaza solo esa y se informa el error;
  - al desmontar se revocan las URLs.
- [X] T017 [US1] Tests en `src/context/notesContext.test.tsx`, `describe("addImageThinking")` en modo offline (con store mockeado):
  - guarda todas las imágenes, agrega un `ImageThinking` al final con `value` en el orden de la vista previa y `text` recortado (se omite si está vacío), y persiste en localStorage sin esperar el debounce;
  - si falla 1 de 3, no cambia la nota, se borran las 2 guardadas y se rechaza con el mensaje de R12;
  - si falla el rollback, las referencias van a la cola de pendientes (mockear `imageCleanup.enqueue`).

### Implementación de la Historia 1

- [X] T018 [P] [US1] Crear `src/components/utils/imageProcessing.ts`:
  - constantes de data-model.md;
  - `extractImageFiles`, `computeTargetSize`, `chooseFallbackFormat` y `validateInputFile` (pasan T014);
  - `compressImage(file): Promise<{ blob; width; height }>`, siguiendo R5: `createImageBitmap`, `OffscreenCanvas` si existe o si no `<canvas>`, `toBlob("image/webp", 0.8)`, verificación de `blob.type` con fallback y rechazo si pasa de 2 MB.
- [X] T019 [P] [US1] Crear `src/services/images/imageStore.ts`:
  - interfaz `ImageStore` según [contracts/storage-thinking-images.md](./contracts/storage-thinking-images.md);
  - clase `ImageStoreError` (`code: "quota" | "network" | "not-found" | "unknown"`) con un mensaje en español por código (R12).
  - `resolveImageStore(ref)` y `storeForMode(isLogged)` devuelven el store local; el remoto se conecta en US4.
- [X] T020 [US1] Crear `src/services/images/localImageStore.ts`, con un wrapper de IndexedDB nativo (R3: base `thinking-notes-images`, store `images`) que implementa `save`, `getUrls` (object URLs en caché por sesión), `getBlob`, `remove` y `listAll` (pasa T015)
- [X] T021 [US1] Crear `src/hooks/usePendingImages.ts`:
  - estado `PendingImage[]` (data-model.md);
  - `addFiles(files)` comprime en paralelo y muestra un placeholder mientras tanto;
  - `remove(localId)`, `clear()` y `error`;
  - limpia las object URLs (pasa T016).
- [X] T022 [US1] En `src/context/notes-context.ts` y `src/context/notesContext.tsx`, agregar `addImageThinking(blobs: Blob[], text: string): Promise<void>`:
  - guarda en `storeForMode(isLogged)` con `Promise.allSettled`;
  - ante una falla, hace rollback y relanza `ImageStoreError`;
  - si todo sale bien, agrega el pensamiento a `activeNoteState` y fuerza el guardado inmediato con `flushSave`.

  Para `flushSave`: marcar una bandera de estado `pendingFlush` y, en un `useEffect` que corre después de que `latestStateRef` se sincroniza, llamar a `saveUpdatesNotesOnDBorLocalStorage`. Usar `waitingResponse = "uploadingImages"` durante la subida (pasa T017).
- [X] T023 [P] [US1] Crear `src/components/notes/noteContent/components/imagePreviewTray.tsx`, según [contracts/thinking-input-ui.md](./contracts/thinking-input-ui.md):
  - miniaturas con un botón ✕ (`aria-label="Quitar imagen N"`), placeholder con spinner y mensaje de error con `role="alert"`;
  - estilos en `src/components/notes/noteContent/styles.css`.
- [X] T024 [US1] Integrar en `src/components/notes/noteContent/components/activeNoteView.tsx`:
  - `onPaste` en el textarea de nuevo pensamiento: si `extractImageFiles` devuelve archivos, `preventDefault` y `addFiles`;
  - `canSubmit` se habilita con texto o con al menos 1 imagen y sin subida en curso;
  - `submitDraft`: si hay imágenes, `await addImageThinking(blobs, text)` y, si sale bien, limpia la bandeja y el borrador; si falla, muestra el error y conserva todo;
  - vaciar la bandeja al cambiar de nota activa;
  - el texto dictado sigue funcionando como texto acompañante.
- [X] T025 [US1] Render mínimo de los `ImageThinking` en `activeNoteView.tsx` (una fila de `<img>` con `useImageUrls`, que crea T026) para poder verificar esta historia. US2 lo reemplaza por el componente final
- [X] T026 [US1] Crear `src/hooks/useImageUrls.ts`: recibe `refs: ImageRef[]`, resuelve cada una con `resolveImageStore(ref).getUrls` y devuelve `Map<ref, { status: "loading" | "ready" | "error"; url?: string }>`; cancela al desmontar
- [ ] T027 [US1] Verificación manual del quickstart, sección "sin sesión", pasos 1 a 7

**Checkpoint**: MVP sin sesión. Se pegan imágenes y se guardan en IndexedDB, sin base64 en
localStorage.

---

## Fase 4: Historia 2 – Ver las imágenes en la nota (P1)

**Objetivo**: miniaturas agrupadas con su texto, estados de carga y error, y visor
ampliado con navegación.

**Prueba independiente**: una nota con pensamientos de texto, de 1 imagen y de 3 imágenes
con texto. Las miniaturas se ven sin saltos; tocar una abre el visor; ←/→ y deslizar
cambian de imagen; Escape cierra y el foco vuelve a la miniatura.

- [X] T028 [P] [US2] Crear `src/components/notes/noteContent/components/imageThinking.tsx` (modo vista):
  - grilla según la cantidad de imágenes (contrato de UI);
  - cada miniatura es un `<button aria-label="Ver imagen N de M">` con `<img loading="lazy" decoding="async" alt>`;
  - placeholder de tamaño fijo mientras carga y "Imagen no disponible" si falla (`useImageUrls`);
  - el texto acompañante va debajo y respeta el resaltado de búsqueda que hoy se aplica a los textos.
- [X] T029 [P] [US2] Crear `src/components/notes/noteContent/components/imageViewer.tsx`:
  - `<dialog>` con `showModal()`; cierra con ✕, clic en el backdrop o Escape;
  - anterior/siguiente con botones y flechas, y deslizar con eventos de puntero (umbral de 50 px);
  - indicador "N / M"; al cerrar, devuelve el foco a la miniatura que lo abrió.
- [X] T030 [P] [US2] Estilos de la grilla, los placeholders y el visor (`object-fit: contain`, máximo 90vh/90vw, `::backdrop`) en `src/components/notes/noteContent/styles.css`. Verificar los temas Clásico, Oscuro y Atardecer
- [X] T031 [US2] En `activeNoteView.tsx`, reemplazar el render mínimo de T025:
  - renderizar por tipo: `text` (como hoy), `image` (`ImageThinking` + `ImageViewer`) y desconocido ("Contenido no soportado en esta versión", con el botón de borrar);
  - el contador de ideas cuenta todos los pensamientos.
- [ ] T032 [US2] Verificación manual del quickstart, sección "sin sesión", paso 8, y sección "celular", pasos 2 y 3 (deslizar y fluidez con 20 imágenes)

**Checkpoint**: las historias 1 y 2 funcionan sin sesión.

---

## Fase 5: Historia 3 – Borrar y quitar imágenes sin dejar huérfanos (P1)

**Objetivo**: al borrar un pensamiento o una nota, o al quitar imágenes en la edición, los
archivos se eliminan (o quedan en la cola de pendientes); más una limpieza de respaldo.

**Prueba independiente**: borrar un pensamiento con 2 imágenes deja IndexedDB sin esos
blobs. Al quitar 1 imagen en la edición y confirmar, se borra solo ese archivo; al
cancelar, no se borra nada. Al borrar la nota, se borran todos.

### Tests de la Historia 3

- [X] T033 [P] [US3] Tests en `src/services/images/imageCleanup.test.ts` (localStorage y stores mockeados):
  - `enqueue(refs)` persiste sin repetir en `localStorage["pendingImageDeletions"]`;
  - `processQueue(referencedRefs, { online })`:
    - borra solo las referencias que no están en `referencedRefs`;
    - quita de la cola las borradas y las `not-found`;
    - deja las que fallan;
    - si `online` es false, no toca las remotas;
    - las referencias todavía referenciadas se quitan de la cola sin borrarse.
  - `sweepLocalOrphans(referencedRefs, now)` borra solo las claves sin referencia con más de 10 minutos.
- [X] T034 [US3] Tests en `src/context/notesContext.test.tsx`, en modo offline:
  - borrar un `ImageThinking` encola sus referencias y, después del guardado, `processQueue` las borra;
  - si el guardado falla, no se borra ningún archivo referenciado;
  - `deleteNote` encola todas las referencias de la nota;
  - `editImageThinking`:
    - si quedan imágenes, actualiza `value` y encola las quitadas;
    - si quedan 0 imágenes con texto, pasa a `{ type: "text" }` con el mismo `id`;
    - si quedan 0 imágenes sin texto, se borra.
  - Al iniciar, se procesa la cola y corre `sweepLocalOrphans`.

### Implementación de la Historia 3

- [X] T035 [US3] Crear `src/services/images/imageCleanup.ts` con `enqueue`, `processQueue` y `sweepLocalOrphans` (R7). Las referencias se resuelven con `resolveImageStore`, y `listAll` del store local se usa para la limpieza (pasa T033)
- [X] T036 [US3] En `src/context/notesContext.tsx` y `notes-context.ts`:
  - al guardar con éxito (en los dos modos), llamar a `processQueue` con las referencias de todas las notas (`notes` + `activeNoteState`);
  - en `deleteNote`, encolar las referencias de la nota antes de borrarla;
  - al iniciar, cuando `isLogged` se resuelve, llamar a `processQueue` y, sin sesión, a `sweepLocalOrphans`.
- [X] T037 [US3] En el contexto, agregar `editImageThinking(id, { removedRefs, text })`, aplicando las reglas de data-model.md ("Pensamiento con imágenes al editarlo"), y hacer que borrar un pensamiento con imágenes en `activeNoteView.tsx` encole sus referencias (pasa T034)
- [X] T038 [US3] Modo edición en `imageThinking.tsx`:
  - textarea para el texto;
  - ✕ por imagen (`aria-label="Quitar imagen N"`), que la oculta del borrador;
  - confirmar llama a `editImageThinking`; cancelar (botón o Escape) descarta;
  - pegar imágenes en este textarea no hace nada especial.

  Conectar con el botón de editar existente en `activeNoteView.tsx`.
- [ ] T039 [US3] Verificación manual del quickstart, sección "sin sesión", pasos 9 a 11

**Checkpoint**: el modo sin sesión está completo (US1–US3), sin archivos huérfanos.

---

## Fase 6: Historia 5 – Las notas remotas existentes siguen funcionando (P1)

**Objetivo**: la API acepta y devuelve solo `Thinking[]`, valida las referencias y los datos
remotos existentes se migran una vez. La parte local ya se hizo en la Fase 2.

**Prueba independiente**: con notas remotas creadas antes del cambio, aplicar el SQL y
desplegar el backend. La app muestra los mismos textos en el mismo orden; un
`contentList` de strings recibe 400.

- [X] T040 [P] [US5] Tests en `../thinking-notes-backend/src/notes/content-list.spec.ts` para `parseContentList(input, { userId, noteId?, isCreate })`: un caso por cada fila de la tabla de reglas de [contracts/api-notes-content-list.md](./contracts/api-notes-content-list.md), incluidos los tipos desconocidos que se conservan, una referencia de otro usuario, una referencia de otra nota y una imagen en `create`. Todas las fallas son `BadRequestException` con el mensaje del contrato
- [X] T041 [US5] Crear `../thinking-notes-backend/src/notes/content-list.ts` con el tipo `Thinking` y `parseContentList` (pasa T040)
- [X] T042 [US5] En `../thinking-notes-backend/src/notes/notes.service.ts`:
  - `create` y `updateById` reciben `contentList: unknown` y validan con `parseContentList`;
  - `updateById` usa `noteId`;
  - los tipos de retorno pasan a `Thinking[]`.

  Actualizar `src/notes/dto/create-note.dto.ts`, `update-note.dto.ts` y `delete-note.dto.ts` (tipos), `notes.controller.ts` si castea, y `notes.service.spec.ts`. Correr `npm test`.
- [X] T043 [P] [US5] Crear `../thinking-notes-backend/prisma/sql/002-content-list-typed.sql` según el contrato (transacción, `WITH ORDINALITY`, solo filas con algún elemento string, `NULL` → `[]`), con la consulta de verificación comentada al final
- [ ] T044 [US5] Aplicar el SQL 002 en el proyecto Supabase de desarrollo y verificar con la consulta (debe dar 0). Aplicarlo de nuevo no debe cambiar nada. Después, verificar desde la app con sesión (quickstart, "Migración")

**Checkpoint**: con sesión, los pensamientos de texto funcionan con el formato nuevo de
punta a punta.

---

## Fase 7: Historia 4 – Imágenes con sesión iniciada (P1)

**Objetivo**: con sesión, las imágenes van al bucket privado con RLS, se muestran con
URLs firmadas y se limpian en la nube.

**Prueba independiente**: con sesión, pegar, ver, editar y borrar imágenes. En Storage
aparecen y desaparecen los archivos. Otro navegador con la misma cuenta los ve; otra
cuenta no puede acceder. Sin red, la subida falla con el mensaje y se conserva la vista
previa.

### Tests de la Historia 4

- [X] T045 [P] [US4] Tests en `src/services/images/remoteImageStore.test.ts`, con `supabase.storage` y `supabase.auth.getSession` mockeados:
  - `save` sube a `<uid>/<noteId>/<uuid>.<ext>` con `upsert: false` y el `contentType` correcto;
  - `getUrls` hace una sola llamada `createSignedUrls(paths, 3600)`, reutiliza la caché y la renueva si quedan menos de 300 s;
  - `remove` trata un 404 como éxito;
  - `listForNote` devuelve las referencias y `createdAt`;
  - un error de red se convierte en `ImageStoreError("network")`;
  - sin sesión, rechaza.
- [X] T046 [US4] Tests en `src/context/notesContext.test.tsx` y `imageCleanup.test.ts`, en modo online:
  - `addImageThinking` usa el store remoto y la nota se guarda con `updateNoteService`;
  - si la subida falla, la nota no cambia;
  - `processQueue` con `online: true` borra las referencias remotas;
  - al abrir una nota, `sweepRemoteNote(noteId, referencedRefs)` borra los archivos sin referencia con más de 10 minutos;
  - `deleteNote` borra la carpeta de la nota (`listForNote` + `remove`) después del `DELETE` exitoso y, si falla, encola.

### Implementación de la Historia 4

- [ ] T047 [P] [US4] Crear `../thinking-notes-backend/prisma/sql/003-storage-thinking-images.sql`, con el bucket y las políticas de [contracts/storage-thinking-images.md](./contracts/storage-thinking-images.md). Usar `insert … on conflict do update` para el bucket y `drop policy if exists` + `create policy` para que sea idempotente. Aplicarlo en Supabase de desarrollo
- [X] T048 [US4] Crear `src/services/images/remoteImageStore.ts`:
  - usa `supabase` de `lib/supabaseClient`;
  - el uid sale de `getSession()`;
  - `IMAGES_BUCKET`, `save`, `getUrls` con caché, `getBlob`, `remove`, `listForNote` y `removeNoteFolder(noteId)`;
  - pasa T045.
- [X] T049 [US4] Conectar el store remoto en `src/services/images/imageStore.ts`: `resolveImageStore(ref)` devuelve el remoto si la referencia no empieza con `local:`, y `storeForMode("online")` también devuelve el remoto
- [X] T050 [US4] En `src/services/images/imageCleanup.ts` agregar `sweepRemoteNote`. En `src/context/notesContext.tsx`:
  - llamar a `sweepRemoteNote` en `setActiveNote` si hay sesión, sin esperarla y sin bloquear la UI;
  - en `deleteNote` online, llamar a `removeNoteFolder` después del `DELETE` (si falla, encolar);
  - procesar la cola en cada cambio de sesión a online.

  Pasa T046.
- [X] T051 [US4] En `useImageUrls.ts`, cuando una URL firmada da error al cargar el `<img>`, reintentar una sola vez pidiendo una URL nueva antes de mostrar "Imagen no disponible". Sin sesión, una referencia remota muestra directamente "Imagen no disponible"
- [ ] T052 [US4] Verificación manual del quickstart, sección "con sesión", pasos 1 a 6, incluida la prueba de aislamiento SC-005 con dos cuentas

**Checkpoint**: paridad con y sin sesión completa (principio I).

---

## Fase 8: Historia 6 – Exportar y copiar notas con imágenes (P3)

**Objetivo**: el PDF incluye las imágenes; al copiar y en Markdown aparece "[Imagen]".

**Prueba independiente**: exportar a PDF una nota con texto, 1 imagen y 3 imágenes con
texto: aparecen en orden y con saltos de página. Si una imagen no se puede obtener,
aparece "[Imagen no disponible]".

- [X] T053 [P] [US6] Tests en `src/components/utils/copyNote.test.ts` y `exportNote.test.ts` (Markdown): una imagen sola da `[Imagen]`, dos imágenes con texto dan `[Imagen] [Imagen] texto`, y las imágenes sin texto no se descartan por estar "vacías"
- [X] T054 [US6] Implementar en `src/components/utils/copyNote.ts` y `noteToMarkdown` de `src/components/utils/exportNote.ts` (pasa T053)
- [X] T055 [P] [US6] Tests de `downloadNoteAsPdf(note, { getImageBlob })` en `src/components/utils/exportNote.test.ts`, con jsPDF y la conversión a JPEG (`blobToJpegDataUrl`) mockeados:
  - llama a `addImage` por cada imagen en orden, con ancho igual al útil y alto proporcional;
  - agrega página cuando no entra;
  - si `getImageBlob` falla, escribe "[Imagen no disponible]" y sigue;
  - el texto acompañante va después de las imágenes.
- [X] T056 [US6] Implementar en `src/components/utils/exportNote.ts`:
  - `blobToJpegDataUrl(blob)`: `createImageBitmap`, canvas con fondo blanco y `toDataURL("image/jpeg", 0.85)`;
  - el render de imágenes en `downloadNoteAsPdf` según R9;
  - pasa T055.
- [X] T057 [US6] En `src/components/notes/noteContent/components/downloadMenu.tsx`, pasar `getImageBlob: (ref) => resolveImageStore(ref).getBlob(ref)` y mostrar un estado "Generando PDF…" mientras se exporta
- [ ] T058 [US6] Verificación manual del quickstart, sección "sin sesión", pasos 12 y 13, y exportar a PDF con sesión

---

## Fase 9: Polish y temas transversales

- [ ] T059 [P] Accesibilidad: recorrer con teclado el pegado, la bandeja (quitar), las miniaturas, el visor y el modo edición; foco visible en los tres temas; los `alt` y `aria-label` del contrato de UI
- [X] T060 [P] Revisar los textos en español y los mensajes de error de R12 en todos los componentes nuevos; los errores tienen `role="alert"` y desaparecen al corregir
- [X] T061 Lint: dejar sin errores `activeNoteView.tsx`, `notesContext.tsx` y todos los archivos nuevos; `npm run lint` no debe sumar errores respecto de `main`
- [X] T062 [P] Backend: `npm run lint` y `npm run build` en `../thinking-notes-backend`
- [X] T063 Subir la versión a `1.9.0` en `package.json` (commit `chore: subir versión a 1.9.0`)
- [X] T064 Gates finales: `npm test`, `npm run build` (comparar el chunk principal con T003) y `npm run lint`. Verificación del quickstart, sección "celular", pasos 1 y 4 (pegar desde Gboard e instalación/actualización de la PWA), y anotar el comportamiento en iOS Safari (limitación R6)
- [ ] T065 Despliegue coordinado (contrato API, "Orden de despliegue"): SQL 002 y 003 en Supabase de producción, después el backend, después el PR del frontend a `main` (Vercel). Verificar en producción la migración (consulta = 0) y una subida con sesión

---

## Dependencias y orden de ejecución

### Entre fases

- **Setup (F1)** → **Fundacional (F2)**, que bloquea todo.
- **US1 (F3)** depende de F2.
- **US2 (F4)** depende de US1 (reemplaza el render mínimo y usa `useImageUrls`).
- **US3 (F5)** depende de US1 (necesita pensamientos con imágenes para borrar). Se puede hacer en paralelo con US2, con cuidado en `activeNoteView.tsx`. La edición (T038) depende de T028.
- **US5 (F6)** depende solo de F2 (es backend + SQL). Se puede hacer en paralelo con F3–F5 porque toca otro repo.
- **US4 (F7)** depende de US1–US3 (reutiliza flujos y limpieza) y de US5 (la API tiene que aceptar `image`).
- **US6 (F8)**: la parte de Markdown y copia (T053–T054) depende solo de F2. La de PDF (T055–T057) depende de US1 (`getBlob`); para probarla con sesión, de US4.
- **Polish (F9)** depende de todo.

### Dentro de cada historia

Tests → utilidades y servicios → contexto → componentes → integración en
`activeNoteView.tsx` → verificación manual.

### Grafo

```text
F1 → F2 ─┬─► US1 ─┬─► US2 ─┐
         │        └─► US3 ─┼─► US4 ─► US6 (PDF con sesión) ─► F9
         ├─► US5 ──────────┘
         └─► US6 (Markdown/copia)
```

## Ejemplos de paralelismo

- **F2**: T004, T007, T009, T011 y T012 en paralelo (archivos distintos); después T005 → T006 → T008/T010/T013.
- **US1**: T014, T015, T016, T018, T019 y T023 en paralelo; después T020, T021 → T022 → T024–T026.
- **US2**: T028, T029 y T030 en paralelo; después T031.
- **US5 en paralelo con US1–US3** (otro repo): T040 y T043 en paralelo; después T041 → T042 → T044.
- **US4**: T045 y T047 en paralelo; después T048 → T049 → T050/T051.
- **US6**: T053 y T055 en paralelo.

## Estrategia de implementación

### MVP (sin sesión)

1. F1 + F2: formato nuevo sin regresiones (checkpoint con `npm test` y build).
2. US1: pegar y guardar en IndexedDB. **Parar y validar** (quickstart, pasos 1–7).
3. US2 + US3: ver, editar y borrar sin huérfanos. Con esto, el modo sin sesión está
   completo y se puede demostrar.

### Incremental

4. US5 (backend + migración), en paralelo desde el paso 2.
5. US4: modo con sesión y paridad completa.
6. US6: exportación y copia.
7. Polish y despliegue coordinado (T065). **No mergear el frontend a `main` antes de que
   la migración y el backend estén en producción**: Vercel despliega en cada push.

### Notas

- Cada tarea termina con tests en verde. Commits en español con Conventional Commits
  (por ejemplo `feat: pegar imágenes en pensamientos`, `test: …`, `refactor: tipar pensamientos`).
- Los pensamientos no se reordenan (spec, aclaración 1): no agregar drag & drop a la lista
  de pensamientos.
