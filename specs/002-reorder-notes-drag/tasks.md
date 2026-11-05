---
description: "Lista de tareas para reordenar notas arrastrando en el panel lateral"
---

# Tareas: Reordenar notas arrastrando en el panel lateral

**Input**: Documentos de diseño en `specs/002-reorder-notes-drag/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: se incluyen porque la constitución (principio III) exige tests de Vitest para toda lógica nueva o modificada (contexto, servicios, utilidades), en ambos modos. La UI se verifica manualmente según [quickstart.md](./quickstart.md).

**Organización**: tareas agrupadas por historia de usuario para implementarlas y probarlas de forma independiente.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)

## Convenciones de rutas

- **Frontend** (este repo): `src/…` desde la raíz de `thinking-notes`.
- **Backend** (repo hermano): `../thinking-notes-backend/…`.

---

## Fase 1: Setup

**Propósito**: rama de trabajo y dependencias.

- [X] T001 Crear la rama `feat/reorder-notes-drag` desde `main` actualizado en este repo, y una rama `feat/reorder-notes` en `../thinking-notes-backend`
- [X] T002 Instalar las dependencias de arrastre en `package.json`: `npm install @dnd-kit/core@^6 @dnd-kit/sortable@^10 @dnd-kit/utilities@^3` (justificación en research R1). Anotar antes el tamaño gzip del chunk principal de `npm run build` para compararlo en T040

---

## Fase 2: Fundacional (bloquea todas las historias)

**Propósito**: lógica pura y tipos que usan todas las historias.

**⚠️ CRÍTICO**: ninguna historia empieza hasta terminar esta fase.

- [X] T003 [P] Escribir tests de `moveNote` en `src/components/utils/reorder.test.ts`: mover hacia arriba (A,B,C,D: D→A ⇒ D,A,B,C), hacia abajo (A→C ⇒ B,C,A,D), misma posición devuelve **la misma referencia** de array, `fromId` u `overId` inexistente devuelve la misma referencia, lista vacía y de un elemento, no muta el array de entrada, no pierde ni duplica notas
- [X] T004 Implementar `moveNote(notes: INotes[], fromId: string, toId: string): INotes[]` en `src/components/utils/reorder.ts` (equivalente a `arrayMove` por índices; devuelve el mismo array si no hay cambio) hasta que pasen los tests de T003
- [X] T005 [P] Agregar `"reorderingNotes"` a `WaitingResponseType` en `src/types/index.ts`
- [X] T006 Agregar a `NotesContextType` en `src/context/notes-context.ts`: `reorderNotes: (activeId: string, overId: string) => Promise<void>`, `reorderError: string | null` y `clearReorderError: () => void` (ver data-model.md)

**Checkpoint**: `npm test` verde; los tipos compilan.

---

## Fase 3: Historia 1 – Reordenar notas arrastrándolas (P1) 🎯 MVP

**Objetivo**: en escritorio, clic + arrastrar mueve una nota a otra posición de la lista; un clic breve sigue abriéndola. El orden se mantiene mientras la app está abierta (la persistencia llega en US2).

**Prueba independiente**: con 3+ notas, arrastrar la segunda al primer lugar → la lista queda reordenada y el resto conserva su orden relativo; un clic breve abre la nota; `Escape` o soltar fuera cancela.

### Tests de la Historia 1

- [X] T007 [US1] Agregar a `src/context/notesContext.test.tsx` un `describe("reorderNotes")` con: reordena `notes` en memoria según `moveNote`; soltar en la misma posición no cambia `notes` ni llama a `localStorage.setItem` ni a la API; la nota activa (`activeNoteState`) sigue siendo la misma tras reordenar

### Implementación de la Historia 1

- [X] T008 [US1] Implementar `reorderNotes(activeId, overId)` en `src/context/notesContext.tsx`: calcula `moveNote(notes, activeId, overId)`; si devuelve la misma referencia, retorna sin hacer nada; si no, `setNotes(next)`. Exponer `reorderNotes`, `reorderError` (estado `useState<string | null>(null)`, aún sin usar) y `clearReorderError` en el `value` del provider. Hacer pasar T007
- [X] T009 [US1] Convertir `NoteItem` en ítem ordenable en `src/components/notes/noteItem/index.tsx`: agregar prop `disabled: boolean`; usar `useSortable({ id, disabled })` de `@dnd-kit/sortable`; aplicar `setNodeRef`, `attributes`, `listeners` y `style = { transform: CSS.Transform.toString(transform), transition }` (de `@dnd-kit/utilities`) al `div.note-item-container`; agregar la clase `dragging` cuando `isDragging`; mantener la clase `active` y el `onClick` existente
- [X] T010 [US1] Envolver la lista en `src/components/sidebar/index.tsx` con `DndContext` + `SortableContext` (`items = notes.map(n => n.id!)`, `strategy = verticalListSortingStrategy`) solo cuando `!collapsed`. Sensores: `useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 6 } }))`. Modifier inline que fuerza `x = 0` (eje vertical). `onDragEnd({ active, over })`: si `over` es null o `active.id === over.id` no hacer nada; si no, `reorderNotes(String(active.id), String(over.id))`. Pasar `disabled={waitingResponse !== "none"}` a cada `NoteItem`. Usar `reorderNotes` y `waitingResponse` de `useNotes()`
- [X] T011 [P] [US1] Estilos de arrastre en `src/components/notes/noteItem/styles.css`: `.note-item-container { cursor: grab; }`, `.note-item-container.dragging { cursor: grabbing; z-index: 10; box-shadow: <sombra más marcada>; scale: 1.02; opacity: 0.95; }`; transición de vecinos ≈150 ms (la aporta `transition` de dnd-kit). Verificar que la animación `expandToActive` de la nota activa no se rompa
- [X] T012 [US1] Confirmar que `.sidebar-notes-list` en `src/components/sidebar/styles.css` es el contenedor scrolleable (`overflow-y: auto`, alto acotado) para que el auto-scroll de dnd-kit funcione al acercarse a los bordes (FR-006); ajustar si el scroll lo hace otro ancestro

**Checkpoint**: `npm run dev` → pasos 2–6, 8 y 9 de “Verificación manual — modo sin sesión” de quickstart.md, **excepto** recargar (todavía no persiste). `npm test` verde.

---

## Fase 4: Historia 2 – El orden se conserva (P1)

**Objetivo**: el orden persiste al recargar, sin sesión (`localStorage`) y con sesión (backend, entre dispositivos); si falla el guardado, se avisa y se vuelve al orden anterior.

**Prueba independiente**: reordenar, recargar → mismo orden, en ambos modos; con sesión, otro navegador ve el mismo orden; bloqueando `PUT /notes/order` aparece el error y la lista vuelve atrás.

### Backend (`../thinking-notes-backend`)

- [X] T013 [US2] Agregar a `model Note` en `../thinking-notes-backend/prisma/schema.prisma`: `position Int @default(0)` y `@@index([userId, position], map: "idx_notes_user_position")`
- [ ] T014 [US2] Crear `../thinking-notes-backend/prisma/sql/001-notes-position.sql` con `ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;`, el `CREATE INDEX IF NOT EXISTS idx_notes_user_position ON public.notes (user_id, position);` y el `UPDATE` de backfill con `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1` de data-model.md. Aplicarlo en Supabase (SQL editor) y correr `npx prisma generate` (el repo no usa `prisma/migrations`)
- [X] T015 [US2] En `getAllByUserId` de `../thinking-notes-backend/src/notes/notes.service.ts` cambiar `orderBy` a `[{ position: 'asc' }, { createdAt: 'desc' }]`
- [X] T016 [US2] En `create` de `../thinking-notes-backend/src/notes/notes.service.ts` calcular `position = (aggregate _max.position del usuario ?? -1) + 1` y guardarla (nota nueva al final, FR-012)
- [X] T017 [P] [US2] Crear `../thinking-notes-backend/src/notes/dto/reorder-notes.dto.ts`: `ReorderNotesDto { ids: string[] }` con `@IsArray()`, `@ArrayNotEmpty()`, `@ArrayUnique()`, `@IsUUID('all', { each: true })`
- [X] T018 [US2] Agregar `reorder(userId, ids)` en `../thinking-notes-backend/src/notes/notes.service.ts`: dentro de `prisma.$transaction`, verificar con `count({ where: { userId, id: { in: ids } } }) === ids.length` (si no → `BadRequestException('Alguna nota no existe o no te pertenece')`); sumar `ids.length` a la `position` de las notas del usuario que no estén en `ids`; asignar `position = índice` a cada id; devolver `{ ids }`. Envolver errores de Prisma en `InternalServerErrorException('No se pudo guardar el orden')`
- [X] T019 [US2] Agregar `@Put('order')` con `@UseGuards(SupabaseAuthGuard)` en `../thinking-notes-backend/src/notes/notes.controller.ts`, **declarado antes de** `@Put(':id')`, que recibe `ReorderNotesDto` y llama a `notesService.reorder(userId, dto.ids)` (mismo chequeo de `userId` que los otros endpoints)
- [ ] T020 [US2] Tests Jest del backend en `../thinking-notes-backend/src/notes/notes.service.spec.ts` (crear si no existe, con `PrismaService` mockeado): `reorder` asigna posiciones por índice; rechaza ids ajenos sin tocar nada; `create` asigna max+1 y 0 sin notas; `getAllByUserId` ordena por `position`. Correr `npm test` y `npm run build` en el backend, mergear y desplegar **antes** del frontend (research R8)

### Tests del frontend

- [X] T021 [P] [US2] Test de `reorderNotesService` en `src/services/service.test.ts` (crear; mockear `fetch` global y `supabase.auth.getSession` de `lib/supabaseClient`): hace `PUT` a `/notes/order` con body `{ ids }` y header `Authorization: Bearer <token>`; propaga el error con el `message` del backend si `!response.ok`
- [X] T022 [US2] Ampliar `describe("reorderNotes")` en `src/context/notesContext.test.tsx`: **offline** guarda en `localStorage` (`STORAGE_KEY`) el array reordenado y al volver a montar el provider se carga en ese orden; **offline con error** (`localStorage.setItem` lanza) revierte `notes` y setea `reorderError`; **online** llama a `reorderNotesService` con los ids en el nuevo orden y pone `waitingResponse` en `"reorderingNotes"` mientras espera y `"none"` al terminar; **online con error** revierte al orden anterior, setea `reorderError` y deja `waitingResponse` en `"none"`; `clearReorderError` lo vuelve a `null`
- [X] T023 [US2] Test de la carrera (research R5) en `src/context/notesContext.test.tsx`: online, iniciar `saveUpdatesNotesOnDBorLocalStorage` con `updateNoteService` pendiente, cambiar el orden de `notes` (vía `setNotes` o `reorderNotes`), resolver la respuesta → `notes` conserva el orden nuevo y el contenido actualizado de la nota

### Implementación del frontend

- [X] T024 [US2] Agregar `reorderNotesService(ids: string[]): Promise<{ ids: string[] }>` en `src/services/service.ts` (`fetchJson` con `PUT /notes/order`, body `JSON.stringify({ ids })`) según contracts/api-notes-order.md. Hacer pasar T021
- [X] T025 [US2] Completar `reorderNotes` en `src/context/notesContext.tsx` (research R4): guardar `previous = notes`; `setNotes(next)`; **offline**: `localStorage.setItem(STORAGE_KEY, JSON.stringify(next))` en `try`, y en `catch` `setNotes(previous)` + `setReorderError("No se pudo guardar el orden de las notas.")`; **online**: `setWaitingResponse("reorderingNotes")`, `await reorderNotesService(next.map(n => n.id!))`, en `catch` revertir + mismo error, en `finally` `setWaitingResponse("none")`. Implementar `clearReorderError`. Hacer pasar T022
- [X] T026 [US2] Corregir la carrera en `saveUpdatesNotesOnDBorLocalStorage` de `src/context/notesContext.tsx`: en la rama online reemplazar `setNotes(newArrayNotes)` por `setNotes(prev => prev.map(note => note.id === response.id ? { id: response.id, title: response.title, thinkings: response.contentList } : note))`; en la rama offline usar también la forma funcional y escribir en `localStorage` el resultado. Hacer pasar T023 sin romper los tests existentes de guardado con debounce
- [X] T027 [US2] Mostrar estado y error en `src/components/sidebar/index.tsx`: mientras `waitingResponse === "reorderingNotes"`, un indicador pequeño (`Loader2` con la clase `spinner-icon` existente) en la cabecera de la lista; si `reorderError`, un mensaje inline (`role="status"`) con el texto del error que llama a `clearReorderError` a los 4 s (`useEffect` + `setTimeout` con limpieza)
- [X] T028 [P] [US2] Estilos del indicador y del mensaje de error en `src/components/sidebar/styles.css` (texto chico, color de error legible sobre el fondo del sidebar, aparición con fade ≈150 ms, sin desplazar bruscamente la lista)

**Checkpoint**: `npm test` verde; quickstart.md completo para “modo sin sesión” (incluido recargar) y “modo con sesión” (pasos 1–6).

---

## Fase 5: Historia 3 – Reordenar desde el celular (P2)

**Objetivo**: mantener apretado ~400 ms levanta la nota; deslizar rápido sigue scrolleando; sin menú contextual ni selección de texto.

**Prueba independiente**: en un celular, 20 deslizamientos rápidos no inician ningún arrastre; mantener apretado levanta la nota (con vibración en Android) y permite moverla.

- [X] T029 [US3] Agregar el sensor táctil en `src/components/sidebar/index.tsx`: `useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 6 } })` junto al `MouseSensor` de T010 (no usar `PointerSensor`, que no distingue scroll de long-press)
- [X] T030 [US3] Feedback al levantar en `src/components/sidebar/index.tsx`: `onDragStart` llama a `navigator.vibrate?.(10)` (guardar con `typeof navigator.vibrate === "function"` para TypeScript estricto)
- [X] T031 [P] [US3] Estilos táctiles en `src/components/notes/noteItem/styles.css` sobre `.note-item-container`: `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; touch-action: manipulation;` (no `none`, para no romper el scroll — research R6)
- [X] T032 [US3] Evitar el menú contextual al mantener apretado en `src/components/notes/noteItem/index.tsx`: `onContextMenu={(e) => e.preventDefault()}` en el contenedor del ítem

**Checkpoint**: “Verificación manual — celular” de quickstart.md (pasos 1–4), con DevTools en emulación táctil y en un dispositivo real.

---

## Fase 6: Pulido y transversales

- [X] T033 [P] Revisar lint de los archivos tocados (`src/context/notesContext.tsx`, `src/components/sidebar/index.tsx`, `src/components/notes/noteItem/index.tsx`, `src/components/utils/reorder.ts`, `src/services/service.ts`) con `npx eslint <archivos>` y dejarlos sin errores; `npm run lint` no debe sumar problemas respecto de `main` (13 al 2026-11-05)
- [X] T034 [P] Verificar que no quedó `any` en el código nuevo y que `npm run build` (`tsc -b`) pasa con `strict`
- [X] T035 Correr `npm test` completo y verificar que pasan los tests previos (`useDebounce`, `useSpeechDictation`, `drafts`, `dictation`, guardado con debounce del contexto)
- [ ] T036 Verificar casos borde de spec.md en la app: 0 y 1 nota, nota activa arrastrada, borrar tras reordenar, crear tras reordenar (online: aparece al final y sigue al final tras recargar), panel colapsado, arrastre bloqueado mientras se guarda una nota
- [ ] T037 Probar la PWA instalada (paso 4 de “celular” en quickstart.md) y confirmar que el service worker sigue actualizando
- [X] T038 [P] Subir la versión a 1.5.0 en `package.json` (funcionalidad nueva, como en `chore: subir versión a 1.4.0`)
- [X] T039 [P] Actualizar `README.md` con la funcionalidad de reordenar (mencionar long-press en celular)
- [X] T040 Comparar el tamaño del chunk principal de `npm run build` con el anotado en T002 y registrar el costo real de dnd-kit en el PR

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Setup (F1)** → sin dependencias.
- **Fundacional (F2)** → depende de F1; bloquea todas las historias.
- **US1 (F3)** → depende de F2. Es el MVP.
- **US2 (F4)** → backend (T013–T020) puede empezar en paralelo con F2/F3 porque es otro repo. El frontend de US2 (T021–T028) depende de T008 (`reorderNotes` base) y T010 (sidebar con DndContext).
- **US3 (F5)** → depende de T009–T010 (ítem ordenable y sidebar). Independiente de US2.
- **Pulido (F6)** → después de las historias que se vayan a entregar.

### Dentro de cada historia

- Tests antes que implementación (T007→T008, T021→T024, T022→T025, T023→T026).
- Backend: T013→T014→T015/T016→T017→T018→T019→T020.
- `notesContext.tsx` lo tocan T008, T025 y T026: hacerlas en orden, no en paralelo.
- `sidebar/index.tsx` lo tocan T010, T027, T029 y T030: en orden.

### Grafo de historias

```text
F1 Setup ─► F2 Fundacional ─► US1 (MVP) ─┬─► US2 (frontend) ─┐
                                         └─► US3 ────────────┼─► F6 Pulido
Backend US2 (T013–T020, otro repo) ──────────► US2 (frontend) ┘
```

## Oportunidades de paralelismo

### Fase 2

```text
T003 + T005 en paralelo (archivos distintos); luego T004 y T006.
```

### Historia 1

```text
T011 (CSS del ítem) en paralelo con T009/T010.
```

### Historia 2

```text
Repo backend (T013–T020) en paralelo con todo el frontend hasta T024.
T017 (DTO) en paralelo con T015/T016.
T021 (test del servicio) en paralelo con T022/T023 (otro archivo).
T028 (CSS del sidebar) en paralelo con T025/T026.
```

### Historia 3

```text
T031 (CSS táctil) en paralelo con T029/T030.
```

## Estrategia de implementación

### MVP (solo US1)

1. F1 + F2.
2. F3 (US1): arrastre en escritorio con orden en memoria.
3. **Parar y validar** con quickstart.md (sin recargar). Útil para probar la sensación del gesto antes de tocar el backend.

> El MVP **no se debería mergear a `main` solo**: sin US2 el orden se pierde al recargar, lo que la spec considera sin valor real. US1 + US2 forman el primer entregable.

### Entrega incremental

1. Backend (T013–T020) → deploy (compatible hacia atrás).
2. F1 + F2 + US1 + US2 → PR del frontend → deploy. **Primer entregable.**
3. US3 → puede ir en el mismo PR o en uno siguiente.
4. F6 antes de cada merge.

## Notas de implementación (2026-11-05)

- **T014 pendiente (manual)**: el SQL está en `../thinking-notes-backend/prisma/sql/001-notes-position.sql` y ya se corrió `npx prisma generate`; falta **aplicarlo en Supabase**.
- **T020 parcial**: tests (9) y build del backend OK; falta mergear y desplegar el backend **antes** que el frontend.
- **Validación del body**: el backend no tiene `ValidationPipe` global ni `class-transformer`, así que `reorder()` valida `ids` explícitamente (array no vacío de UUIDs sin repetir). El DTO queda como documentación del contrato, igual que los existentes.
- **Reversión ante error**: en vez de `setNotes(previous)` se usa `applyOrder(prev, previousOrder)` (en `reorder.ts`, con tests) para no descartar cambios de contenido llegados durante el guardado.
- **Rama offline del guardado (T026)**: no tiene `await`, así que no puede pisar el orden; se dejó como estaba y solo se cambió la rama online a la forma funcional.
- **Cursor**: se mantuvo `cursor: pointer` en reposo (el clic abre la nota) y `grabbing` durante el arrastre.
- **T040**: chunk principal 121,38 kB → 136,69 kB gzip (**+15,3 kB** por dnd-kit).
- **T036/T037 pendientes**: verificación manual en el navegador, en celular y con la PWA instalada (quickstart.md).

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Commits en Conventional Commits en español, por tarea o grupo lógico (p. ej. `feat: reordenar notas arrastrando en el sidebar`, `fix: no pisar el orden al guardar una nota`).
- La verificación manual de la UI se hace en **ambos modos** antes de mergear (constitución, “Flujo de Desarrollo y Calidad”).
