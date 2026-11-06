# Plan de implementación: Pegar imágenes como pensamientos de una nota

**Branch**: `feat/paste-image-thinkings` (a crear desde `main`) | **Fecha**: 2026-11-06 | **Spec**: [spec.md](./spec.md)

**Input**: Especificación de `specs/004-paste-image-thinkings/spec.md`

## Resumen

El usuario pega una o varias imágenes (hasta 5) en el input de pensamientos, las ve en la
vista previa y, al enviar, se crea **un** pensamiento con las imágenes y el texto
opcional. Los pensamientos pasan de `string[]` a una unión tipada
`{ id, type, value, text? }`.

Enfoque técnico (ver [research.md](./research.md)):

- **Modelo**: `Thinking` es una unión discriminada (`text` | `image` | desconocido),
  validada con `parseThinkings` en el frontend y `parseContentList` en el backend. Sin
  compatibilidad con el formato anterior: se migra una vez, con SQL en lo remoto y al
  cargar en lo local.
- **Imágenes**: se comprimen al pegarlas (canvas → WebP 0.8, máximo 1600 px; si el
  navegador no codifica WebP, PNG o JPEG; límites de 20 MB de entrada y 2 MB de salida).
  Se guardan detrás de una interfaz `ImageStore`:
  - **Sin sesión**: IndexedDB nativo, con referencias `local:<uuid>`.
  - **Con sesión**: Supabase Storage, bucket privado `thinking-images` con RLS por
    carpeta `<uid>/`, referencias `<uid>/<noteId>/<uuid>.webp` y URLs firmadas de 1 h.
- **Sin huérfanos**:
  - Al enviar, si falla alguna subida se deshacen las que sí se subieron.
  - Al agregar imágenes, la nota se guarda en el momento.
  - Hay una cola persistente de borrados pendientes, que nunca borra una referencia que
    alguna nota siga usando.
  - Limpieza de respaldo: archivos sin nota con más de 10 minutos (al iniciar en modo
    local, al abrir una nota con sesión).
  - Al borrar una nota se vacía su carpeta en la nube.
- **UI**: bandeja de vista previa, miniaturas agrupadas, visor con `<dialog>` nativo y
  edición que permite quitar imágenes de a una.
- **Exportación**: el PDF incluye las imágenes (convertidas a JPEG en un canvas) o
  "[Imagen no disponible]". Al copiar o exportar a Markdown aparece "[Imagen]".

## Contexto técnico

**Language/Version**: TypeScript ~5.9 (strict), React 19.2. Backend: NestJS 11 + Prisma 7.

**Primary Dependencies**:

- Ya existentes: Vite 7, Context API, lucide-react, `@supabase/supabase-js` (incluye
  Storage), jsPDF 4, uuid.
- **Nueva devDependency**: `fake-indexeddb` (solo para los tests).
- Sin dependencias nuevas en runtime.

**Storage**:

- Notas: `localStorage` (sin sesión); PostgreSQL de Supabase a través de la API NestJS en
  `../thinking-notes-backend`, columna `content_list jsonb` (con sesión).
- Imágenes: IndexedDB `thinking-notes-images` (sin sesión); Supabase Storage, bucket
  privado `thinking-images` (con sesión).

**Testing**: Vitest 5 + Testing Library + jsdom + `fake-indexeddb` en el frontend; Jest en
el backend.

**Target Platform**: PWA en navegadores modernos de escritorio y celular (Chrome/Android,
Safari/iOS, Firefox), desplegada en Vercel.

**Project Type**: aplicación web (SPA/PWA) + API REST en un repo separado.

**Performance Goals**:

- Comprimir una captura de 1920×1080 en menos de 500 ms en escritorio.
- Pegar y enviar en menos de 5 s con 4G (SC-001).
- Una nota con 20 imágenes se desplaza sin bloqueos (SC-006): miniaturas con
  `loading="lazy"` y `decoding="async"`, y una sola llamada de URLs firmadas por nota.

**Constraints**:

- Sin base64 en la base de datos ni en localStorage (FR-009).
- Funciona sin sesión y sin red.
- Las fallas de red no rompen la nota ni dejan huérfanos.
- Sin dependencias nuevas en runtime.

**Scale/Scope**: decenas de notas por usuario y algunas decenas de imágenes por nota.
Cambios en unos 6 archivos existentes del frontend más unos 10 nuevos, 2 archivos del
backend y 2 SQL.

## Constitution Check

*GATE: debe pasar antes de la Fase 0. Se vuelve a chequear después de la Fase 1.*

| Principio | Cumplimiento | Detalle |
|---|---|---|
| I. Paridad Offline/Online | ✅ | `ImageStore` con implementación local (IndexedDB) y remota (Storage); mismo flujo de UI en los dos modos. El modo sin sesión no usa red. Si falla una subida, la vista previa se conserva y la nota no cambia; si falla un borrado, va a la cola de pendientes. Cada historia se verifica en los dos modos ([quickstart.md](./quickstart.md)). |
| II. Minimalista y fluida | ✅ | Pegar, ver la vista previa y enviar, sin pasos extra ni confirmaciones. Se mantiene "Guardando…/Guardado"; spinner al subir; errores en línea con `role="alert"`; el visor se adapta al celular y se puede deslizar. Textos en español. |
| III. Tests para la lógica | ✅ | Tests de `parseThinkings` y migración, `extractImageFiles`, `computeTargetSize` y elección de formato, `localImageStore`, `remoteImageStore` (mock), cola de borrados y limpieza, contexto (OK, rollback, borrados, edición) en los dos modos, búsqueda, copia, Markdown y PDF. Backend: `parseContentList`. La UI se verifica a mano según el quickstart. |
| IV. TypeScript estricto | ✅ | Unión discriminada `Thinking` en `src/types/thinking.ts`. Las entradas externas (localStorage, respuesta de la API, IndexedDB) pasan por parsers con `unknown`, sin `any`. Las conversiones remoto ↔ local son explícitas en `service.ts`. |
| V. Stack estable | ✅ | Sin dependencias nuevas en runtime: IndexedDB, canvas, `<dialog>` y Storage vienen del navegador o de supabase-js, que ya está. Solo `fake-indexeddb` como devDependency, porque jsdom no trae IndexedDB (alternativa descartada: mockear a mano toda la API de IDB, frágil). Ver R3, R5 y R8. |
| Restricción: capa de red | ✅ | Storage y API van por `src/services/` (`service.ts`, `images/remoteImageStore.ts`); los componentes no llaman a `fetch` ni a `supabase.storage`. La autenticación es con el cliente `lib/supabaseClient`. |
| Restricción: secretos | ✅ | Solo se usa la anon key con la sesión del usuario; la seguridad la da RLS. No hay service role en el frontend. |
| Restricción: PWA | ✅ | No cambia la configuración de `VitePWA`. Las URLs firmadas no se cachean en el service worker (`generateSW` solo precachea los assets del build). |
| Flujo: ramas, commits, gates | ✅ | Rama `feat/paste-image-thinkings`; Conventional Commits en español; `build`, `test` y `lint` sin errores nuevos; `activeNoteView.tsx` y `notesContext.tsx` deberían quedar sin errores de lint. Versión 1.9.0. |

**Nuevo chequeo después del diseño**: sin violaciones. Se agrega trabajo en el backend
(otro repo): validación, migración SQL y bucket con RLS. Queda documentado como
dependencia de despliegue en [contracts/api-notes-content-list.md](./contracts/api-notes-content-list.md)
(primero SQL, después backend, después frontend).

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/004-paste-image-thinkings/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── api-notes-content-list.md
│   ├── storage-thinking-images.md
│   └── thinking-input-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; este comando no lo crea)
```

### Código fuente

```text
# Frontend (este repo)
src/
├── types/
│   ├── index.ts                          # INotes.thinkings: Thinking[]; + "uploadingImages"
│   ├── thinking.ts                       # NUEVO: Thinking, TextThinking, ImageThinking, ImageRef, type guards
│   └── thinking.test.ts                  # NUEVO: parseThinkings (migración string → text, idempotencia, desconocidos)
├── services/
│   ├── service.ts                        # RemoteNote.contentList: Thinking[] + parseo explícito
│   └── images/                           # NUEVO
│       ├── imageStore.ts                 # interfaz, resolveImageStore(ref), storeForMode
│       ├── localImageStore.ts            # IndexedDB (+ .test.ts con fake-indexeddb)
│       ├── remoteImageStore.ts           # Supabase Storage, URLs firmadas con caché (+ .test.ts)
│       └── imageCleanup.ts               # cola de pendientes, borrado seguro, limpieza de respaldo (+ .test.ts)
├── context/
│   ├── notes-context.ts                  # + addImageThinking, editImageThinking, flushSave
│   ├── notesContext.tsx                  # carga con parseThinkings, flushSave, borrar nota → limpieza, cola tras guardar
│   └── notesContext.test.tsx             # + casos de imágenes en los dos modos
├── hooks/
│   ├── useNoteSearch.tsx                 # busca en value (text) y text (image)
│   ├── useImageUrls.ts                   # NUEVO: refs → URLs mostrables (estados cargando/error)
│   └── usePendingImages.ts               # NUEVO: bandeja de vista previa (compresión, límite, revocar URLs) (+ .test.ts)
└── components/
    ├── utils/
    │   ├── index.ts                      # loadNotesFromStorage normaliza y reescribe si migró
    │   ├── imageProcessing.ts            # NUEVO: extractImageFiles, computeTargetSize, compressImage, constantes (+ .test.ts)
    │   ├── copyNote.ts                   # "[Imagen]" + texto acompañante
    │   └── exportNote.ts                 # Markdown con "[Imagen]"; PDF con imágenes (getImageBlob inyectado)
    └── notes/noteContent/
        ├── styles.css                    # bandeja, grilla de miniaturas, visor
        └── components/
            ├── activeNoteView.tsx        # onPaste, bandeja, envío con imágenes, render por tipo
            ├── imagePreviewTray.tsx      # NUEVO
            ├── imageThinking.tsx         # NUEVO: miniaturas, texto, modo edición con quitar imagen
            ├── imageViewer.tsx           # NUEVO: <dialog> con navegación
            └── downloadMenu.tsx          # pasa getImageBlob a downloadNoteAsPdf

# Backend (../thinking-notes-backend)
prisma/sql/002-content-list-typed.sql     # NUEVO: migración string → { id, type: "text", value }
prisma/sql/003-storage-thinking-images.sql # NUEVO: bucket privado + políticas RLS
src/notes/content-list.ts                 # NUEVO: tipo Thinking + parseContentList (+ content-list.spec.ts)
src/notes/notes.service.ts                # create/updateById validan con parseContentList
src/notes/dto/{create,update}-note.dto.ts # contentList: Thinking[] (tipado; la validación real está en el service)
```

**Decisión de estructura**: SPA de un solo proyecto, con los cambios en las carpetas que ya
existen. Lo único nuevo es `src/services/images/`, para agrupar las dos implementaciones de
`ImageStore` y la limpieza dentro de la capa de servicios, como pide la constitución. El
backend sigue el patrón de `reorder`: validación manual en el service y SQL versionado en
`prisma/sql/`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| iOS Safari no ofrece "Pegar" en el textarea cuando el portapapeles solo tiene una imagen | Queda documentado (R6). El selector de archivos está fuera de alcance; si se pide, va en una feature aparte. |
| Safari no codifica WebP en canvas | Se usa PNG o JPEG según el original (R5); el límite de 2 MB se sigue respetando. |
| Archivos subidos y la pestaña se cierra antes de guardar la nota | La nota se guarda en el momento al agregar imágenes, más la limpieza de respaldo al abrir la nota (R7). |
| La migración remota se corre parcialmente | El SQL va en una transacción y es idempotente; tiene una consulta de verificación (contrato API). |
| Hoy la app copia notas remotas a localStorage | Las referencias con prefijo (R2) indican dónde resolver cada imagen. Sin sesión, una referencia remota se muestra como "Imagen no disponible". |

## Complexity Tracking

Sin violaciones de la constitución que justificar.
