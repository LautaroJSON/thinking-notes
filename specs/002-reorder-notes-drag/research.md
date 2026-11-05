# Investigación (Fase 0): Reordenar notas arrastrando

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-05

## R1. Cómo implementar el arrastre (mouse + táctil con mantener apretado)

**Decisión**: usar `@dnd-kit/core` + `@dnd-kit/sortable` (+ `@dnd-kit/utilities` para el
`transform` CSS), con dos sensores:

- `MouseSensor` con `activationConstraint: { distance: 6 }` → en escritorio, un clic sin
  mover sigue siendo un clic (abre/cierra la nota) y el arrastre arranca tras 6 px.
- `TouchSensor` con `activationConstraint: { delay: 400, tolerance: 6 }` → en táctil, la
  nota se "levanta" solo tras 400 ms quieta; si el dedo se mueve más de 6 px antes, el
  gesto es un scroll normal.

**Razón** (principio V, dependencia por mérito):

- La API nativa de HTML5 Drag & Drop **no funciona en pantallas táctiles**, que es
  justamente el gesto pedido ("mantener apretado") y un requisito de la PWA.
- Una implementación propia con Pointer Events necesita resolver: long-press con
  tolerancia, distinguir scroll de arrastre, auto-scroll del contenedor (FR-006),
  cancelar con Escape (FR-005), calcular la posición de destino con elementos
  desplazados, animación de los vecinos y limpieza de listeners. Es una pieza de
  ~200–300 líneas difícil de testear en jsdom y propensa a bugs por dispositivo.
- dnd-kit resuelve todo eso de fábrica (sensores con delay/tolerancia, auto-scroll de
  ancestros scrolleables, cancelación con Escape en los sensores de puntero, estrategia
  `verticalListSortingStrategy`), es el estándar de facto en React, compatible con
  React 19 (peer `react >= 16.8`), sin dependencias transitivas pesadas.
- **Costo**: ~15–18 kB gzip entre los tres paquetes (a confirmar con `npm run build`;
  ver quickstart). Aceptable frente a la complejidad que evita.

**Alternativas consideradas**:

| Alternativa | Por qué se descartó |
|---|---|
| HTML5 Drag & Drop nativo | No funciona en táctil; feedback visual pobre y difícil de estilar. |
| Implementación propia con Pointer Events | Mucho código no trivial (auto-scroll, long-press vs scroll, Escape); más riesgo que valor. |
| `@dnd-kit/react` (API nueva 0.x) | Todavía en 0.x; se prefiere la API estable `core`/`sortable`. |
| `@hello-pangea/dnd` / `react-beautiful-dnd` | Más pesada (~30 kB+), orientada a listas complejas; rbd está deprecada. |
| `SortableJS` | Manipula el DOM fuera de React; choca con el render controlado por estado. |

Restringir el movimiento al eje vertical se hace con un *modifier* inline de 3 líneas
(no hace falta sumar `@dnd-kit/modifiers`).

## R2. Dónde vive el orden (modelo de persistencia)

**Decisión**:

- **Offline** (`localStorage`): el orden ES el orden del array guardado en la clave
  `notes`. No se agrega ningún campo; reordenar = reescribir el array.
- **Online**: se agrega una columna `position` (entero) a la tabla `notes` del backend.
  `GET /notes` pasa a ordenar por `position ASC` (desempate `createdAt DESC`). Un nuevo
  endpoint `PUT /notes/order` recibe la lista de IDs en el orden deseado y reasigna las
  posiciones en una transacción.
- En el frontend, `INotes` **no cambia**: el array de notas en memoria ya está ordenado;
  la posición es un detalle del backend.

**Razón**: minimiza cambios en el frontend (el tipo compartido queda igual, lo que
mantiene simple la conversión remoto↔local del principio IV) y hace que reordenar sea
una sola llamada atómica en vez de N `PUT /notes/:id`.

**Alternativas consideradas**:

- *Actualizar `position` nota por nota con `PUT /notes/:id`*: N requests por gesto, sin
  atomicidad; si falla una a mitad de camino el orden queda corrupto. Descartado.
- *Guardar el orden como un array de IDs en el perfil del usuario*: hay que mantenerlo
  sincronizado al crear/borrar notas y mezclarlo al leer. Más frágil. Descartado.
- *Posiciones fraccionarias / LexoRank (mover = actualizar 1 fila)*: optimiza listas
  enormes; una persona tiene decenas de notas, así que reescribir todas las posiciones
  es trivial. Descartado por complejidad innecesaria.

## R3. Orden inicial y notas nuevas (FR-011, FR-012)

Hallazgo: hoy el backend devuelve las notas por `createdAt DESC` (más nuevas arriba),
pero el frontend agrega la nota recién creada **al final** del array; al recargar, salta
arriba. Es una inconsistencia previa.

**Decisión**:

- **Migración**: al crear la columna, se rellena `position` con
  `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1`, así cada
  usuario ve exactamente el orden que veía antes (FR-011).
- **Notas nuevas**: el backend asigna `position = max(position del usuario) + 1`, es
  decir, al final, coherente con lo que el frontend ya muestra al crearla (FR-012). Esto
  además corrige el salto al recargar.
- **Offline**: sin cambios; las notas nuevas ya se agregan al final del array.

## R4. Guardado optimista, estados y errores (FR-007, FR-009, FR-010)

**Decisión**: nueva función `reorderNotes(activeId, overId)` en el contexto:

1. Calcula el nuevo array con una utilidad pura `moveNote(notes, fromId, toId)`.
   Si no cambia nada (misma posición, IDs inexistentes) → no hace nada (caso borde
   "soltar en la misma posición").
2. Actualiza `notes` de inmediato (optimista) para que la UI no "salte".
3. Offline: escribe `localStorage`. Si `setItem` falla (cuota, modo privado) → vuelve
   al orden anterior y expone el error.
4. Online: `waitingResponse = "reorderingNotes"` → `reorderNotesService(ids)`. Si falla
   → vuelve al orden anterior y expone el error. Al terminar → `"none"`.
5. El error se expone como `reorderError: string | null` en el contexto; el sidebar lo
   muestra en un mensaje inline breve que se oculta solo (≈4 s) o al reintentar.

**Razón**: el gesto debe sentirse instantáneo (principio II) y un fallo no debe dejar la
UI distinta de lo guardado (FR-009, SC-005). Volver atrás es más simple y predecible que
reintentar en segundo plano.

**Alternativa descartada**: reintento automático con backoff — agrega estado y casos
borde (¿qué pasa si el usuario reordena de nuevo durante el reintento?) sin ganancia
clara para una app personal.

## R5. Carrera con el guardado de la nota activa

Hallazgo: `saveUpdatesNotesOnDBorLocalStorage` (modo online) toma un snapshot de
`notes`, espera la respuesta y hace `setNotes(snapshot.map(...))`. Si el usuario
reordena mientras ese guardado está en vuelo, al volver la respuesta **pisaría el nuevo
orden** con el viejo.

**Decisión**:

- Deshabilitar el arrastre mientras `waitingResponse !== "none"` (ya lo pide la spec,
  FR-013) — cubre `editingNote`, `creatingNote`, `deletingNote`, `gettingNotes`.
- Además, cambiar ese `setNotes` a la forma funcional `setNotes(prev => prev.map(...))`
  para que nunca reemplace el orden con un snapshot viejo. Es un cambio de una línea que
  elimina la clase de bug por completo; lleva su test (principio III).

## R6. Detalles táctiles y feedback (FR-014, Historia 3)

**Decisión**:

- En `.note-item-container`: `user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none;` para evitar selección de texto y el menú de iOS/Android
  al mantener apretado.
- `touch-action: manipulation` en los ítems (NO `none`), para que el scroll siga
  funcionando antes de que el `TouchSensor` active el arrastre.
- `onDragStart`: `navigator.vibrate?.(10)` (vibración leve donde existe; iOS Safari no la
  soporta y se ignora sin error).
- Ítem arrastrado: leve elevación (sombra + `scale(1.02)`) y opacidad reducida del hueco;
  transición de los vecinos ≈150 ms (principio II: animaciones sutiles).
- Indicador de destino: el propio desplazamiento de los vecinos que hace
  `verticalListSortingStrategy` muestra dónde caerá la nota (FR-004).

## R7. Deshabilitar el arrastre (FR-013)

- Panel colapsado: la lista no se renderiza → no hay nada que arrastrar.
- Operación en curso: `useSortable({ disabled: waitingResponse !== "none" })`.
- Lista de 0–1 notas: no hay cambios posibles; `moveNote` devuelve el mismo array y no
  se guarda nada.
- Botón de borrar: hoy vive en la barra de acciones del sidebar, no dentro del ítem; no
  hay controles internos en `NoteItem`. Si se agregan en el futuro, deberán cortar la
  propagación de `pointerdown`.

## R8. Orden de despliegue (dependencia entre repos)

El cambio de backend es **compatible hacia atrás** (columna con default, `GET` sigue
devolviendo el mismo shape, el endpoint nuevo es aditivo). Orden:

1. Backend: migración + `position` en create + `orderBy` + `PUT /notes/order`. Deploy.
2. Frontend: dnd-kit + `reorderNotes` + UI. Deploy a GitHub Pages.

Si el frontend llegara antes que el backend, `PUT /notes/order` devolvería 404 → el
frontend revierte y muestra el error; no se pierden datos.
