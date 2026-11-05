# Plan de implementación: Reordenar notas arrastrando en el panel lateral

**Branch**: `feat/reorder-notes-drag` (a crear desde `main`) | **Fecha**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Especificación de `specs/002-reorder-notes-drag/spec.md`

## Resumen

Permitir reordenar las notas del sidebar con un gesto de arrastrar (clic + arrastrar en
escritorio, mantener apretado ~400 ms en táctil) y persistir el orden en ambos modos.

Enfoque técnico (ver [research.md](./research.md)):

- **UI**: `@dnd-kit/core` + `@dnd-kit/sortable` con `MouseSensor` (umbral 6 px) y
  `TouchSensor` (delay 400 ms, tolerancia 6 px). La API nativa de drag & drop no funciona
  en táctil, por eso se justifica la dependencia.
- **Lógica**: utilidad pura `moveNote` + `reorderNotes` en `NotesProvider` con
  actualización optimista y reversión ante error.
- **Offline**: el orden es el orden del array en `localStorage` (sin migración).
- **Online**: columna `position` en la tabla `notes` del backend (backfill que preserva el
  orden actual), `GET /notes` ordenado por `position`, nuevo `PUT /notes/order` atómico,
  y notas nuevas al final.

## Contexto técnico

**Language/Version**: TypeScript ~5.9 (strict), React 19.2

**Primary Dependencies**: Vite 7, Context API, lucide-react, Supabase JS; **nuevas**:
`@dnd-kit/core` 6.x, `@dnd-kit/sortable` 10.x, `@dnd-kit/utilities` 3.x

**Storage**: `localStorage` (offline, clave `notes`); API NestJS + Prisma + PostgreSQL
(Supabase) en el repo hermano `thinking-notes-backend` (online)

**Testing**: Vitest 5 + Testing Library + jsdom (frontend); Jest (backend)

**Target Platform**: PWA en navegadores modernos de escritorio y móvil (Chrome/Android,
Safari/iOS), desplegada en GitHub Pages

**Project Type**: aplicación web (SPA/PWA) + API REST en repo separado

**Performance Goals**: arrastre fluido a 60 fps; el cambio de orden se refleja de inmediato
en la UI (optimista); mover la última nota a la primera en < 5 s con 10 notas (SC-001)

**Constraints**: debe funcionar sin sesión y sin red; no romper el scroll táctil; no
perder ni duplicar notas ante errores; costo de bundle acotado (~15–18 kB gzip)

**Scale/Scope**: decenas de notas por usuario; un componente de lista, un ítem, el
contexto, el servicio y un endpoint nuevo en el backend

## Constitution Check

*GATE: debe pasar antes de la Fase 0. Re-chequeado después de la Fase 1.*

| Principio | Cumplimiento | Detalle |
|---|---|---|
| I. Paridad Offline/Online | ✅ | Offline: orden del array en `localStorage`. Online: `position` + `PUT /notes/order`. Si la API falla, se revierte al orden guardado y se avisa; el modo offline no depende de la red. |
| II. Minimalista y fluida | ✅ | Sin confirmaciones; guardado automático al soltar; indicador de guardando y mensaje de error inline; animaciones ~150 ms; long-press pensado para celular; textos en español. |
| III. Tests para la lógica | ✅ | Tests de `moveNote`, `reorderNotes` (offline/online/error/no-op), `reorderNotesService` y del fix de la carrera de guardado (R5). UI verificada manualmente según [quickstart.md](./quickstart.md). Backend con tests del endpoint. |
| IV. TypeScript estricto | ✅ | Sin `any`. Se amplían `WaitingResponseType` y `NotesContextType`; `INotes` no cambia. Respuesta de `PUT /notes/order` tipada en `service.ts`. |
| V. Stack estable, dependencias por mérito | ✅ (justificada) | Se agrega dnd-kit. Problema: arrastre táctil con long-press, auto-scroll y cancelación. Alternativa descartada: HTML5 DnD (no soporta táctil) e implementación propia (~200–300 líneas frágiles). Costo: ~15–18 kB gzip. Ver research R1 y Complejidad. |
| Restricción: capa de red | ✅ | `reorderNotesService` en `src/services/service.ts`; los componentes no hacen `fetch`. |
| Restricción: PWA / base path | ✅ | No toca service worker ni rutas/assets. |
| Flujo: ramas, commits, gates | ✅ | Rama `feat/reorder-notes-drag`; Conventional Commits en español; `build`, `test` y `lint` sin errores nuevos. Los archivos tocados (`notesContext.tsx`, `sidebar/index.tsx`, `noteItem/index.tsx`) deberían quedar sin errores de lint. |

**Re-chequeo post-diseño**: sin violaciones nuevas. El diseño agrega un endpoint y una
columna en el backend (repo separado, fuera del alcance de esta constitución pero
documentado como dependencia en research R8).

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/002-reorder-notes-drag/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/
│   ├── api-notes-order.md
│   └── sidebar-reorder-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks, no lo crea este comando)
```

### Código fuente

```text
# Frontend (este repo)
src/
├── types/index.ts                         # + "reorderingNotes" en WaitingResponseType
├── services/service.ts                    # + reorderNotesService(ids)
├── context/
│   ├── notes-context.ts                   # + reorderNotes, reorderError, clearReorderError
│   ├── notesContext.tsx                   # + reorderNotes (optimista + reversión); setNotes funcional en el guardado (R5)
│   └── notesContext.test.tsx              # + tests de reorderNotes y de la carrera
├── components/
│   ├── utils/
│   │   ├── reorder.ts                     # NUEVO: moveNote(notes, fromId, toId)
│   │   └── reorder.test.ts                # NUEVO
│   ├── sidebar/
│   │   ├── index.tsx                      # DndContext + SortableContext, sensores, mensaje de error, indicador
│   │   └── styles.css                     # estilos del mensaje de error / indicador
│   └── notes/noteItem/
│       ├── index.tsx                      # useSortable, disabled según waitingResponse
│       └── styles.css                     # estado arrastrando, user-select/touch-callout/touch-action

# Backend (../thinking-notes-backend)
prisma/schema.prisma                       # + position Int @default(0), índice (userId, position)
(SQL de migración / backfill)              # ver data-model.md
src/notes/dto/reorder-notes.dto.ts         # NUEVO: { ids: string[] } validado
src/notes/notes.controller.ts              # + @Put('order') antes de @Put(':id')
src/notes/notes.service.ts                 # + reorder() transaccional; create() con max+1; orderBy position
```

**Decisión de estructura**: SPA de un solo proyecto (`src/` con `components`, `context`,
`hooks`, `services`, `types`) más cambios aditivos en el backend existente. No se crean
carpetas nuevas: la utilidad pura va en `components/utils`, junto a `drafts.ts` y
`dictation.ts`.

## Orden de implementación sugerido

1. **Backend** (compatible hacia atrás): columna + backfill → `orderBy` → `create` con
   max+1 → `PUT /notes/order` + tests → deploy.
2. **Frontend lógica**: `moveNote` + tests → tipos → `reorderNotesService` →
   `reorderNotes` en el contexto + tests (offline, online, error, no-op) → fix R5 + test.
3. **Frontend UI**: instalar dnd-kit → `NoteItem` con `useSortable` → `Sidebar` con
   `DndContext`/`SortableContext` → estilos táctiles y de arrastre → mensaje de error.
4. **Validación**: gates automáticos + checklist manual de [quickstart.md](./quickstart.md)
   en ambos modos y en celular.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| El frontend se despliega antes que el backend | `PUT /notes/order` da 404 → se revierte y se avisa; no hay pérdida. Desplegar backend primero. |
| Long-press choca con el menú contextual o la selección en iOS | CSS `-webkit-touch-callout: none` + `user-select: none`; verificación manual en iOS. |
| Un guardado de contenido en vuelo pisa el nuevo orden | Arrastre deshabilitado con `waitingResponse !== "none"` + `setNotes` funcional (R5). |
| `PUT /notes/order` capturado por `PUT /notes/:id` | Declarar la ruta `order` antes de `:id` en el controller; test e2e. |

## Complejidad

| Excepción | Por qué se necesita | Alternativa más simple descartada porque |
|---|---|---|
| Nueva dependencia `@dnd-kit/*` (principio V) | Arrastre táctil con long-press, auto-scroll, cancelación con Escape y animación de vecinos. | HTML5 Drag & Drop no funciona en táctil; una implementación propia con Pointer Events son ~200–300 líneas difíciles de testear en jsdom y frágiles entre dispositivos. |
| Cambio en el backend (repo separado) | El orden debe sincronizarse entre dispositivos con sesión (FR-008, SC-006). | Guardar el orden solo en el dispositivo rompe la paridad online (principio I). |
