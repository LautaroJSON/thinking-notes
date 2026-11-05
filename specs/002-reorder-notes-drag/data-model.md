# Modelo de datos: Reordenar notas arrastrando

**Feature**: [spec.md](./spec.md) | **Investigación**: [research.md](./research.md)

## Frontend

### `INotes` (`src/types/index.ts`) — sin cambios

```ts
interface INotes {
  id?: string;
  title: string;
  thinkings: string[];
}
```

El orden es el **índice en el array** `notes` del contexto. No se agrega campo de
posición en el frontend (ver research R2).

### `WaitingResponseType` (`src/types/index.ts`) — se amplía

```ts
type WaitingResponseType =
  | "gettingNotes"
  | "creatingNote"
  | "deletingNote"
  | "editingNote"
  | "reorderingNotes" // NUEVO: guardando el orden en el backend
  | "none";
```

### `NotesContextType` (`src/context/notes-context.ts`) — se amplía

| Miembro | Tipo | Descripción |
|---|---|---|
| `reorderNotes` | `(activeId: string, overId: string) => Promise<void>` | Mueve la nota `activeId` a la posición de `overId` y persiste el orden. |
| `reorderError` | `string \| null` | Mensaje de error del último guardado de orden fallido; `null` si no hay. |
| `clearReorderError` | `() => void` | Limpia el error (lo usa el sidebar al ocultar el mensaje). |

### Persistencia offline (`localStorage`, clave `notes`)

Mismo formato que hoy: `INotes[]` serializado. El orden del array es el orden visible.
No requiere migración: las notas existentes conservan el orden en que estaban guardadas.

## Backend (`thinking-notes-backend`)

### Tabla `public.notes` — nueva columna

| Columna | Tipo | Nulos | Default | Notas |
|---|---|---|---|---|
| `position` | `integer` | NO | `0` | Orden dentro de las notas del usuario; menor = más arriba. |

Índice nuevo: `(user_id, position)` para el `GET`.

En Prisma (`model Note`): `position Int @default(0)` y
`@@index([userId, position], map: "idx_notes_user_position")`.

**Backfill** (una sola vez, en la migración):

```sql
UPDATE public.notes n
SET position = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.notes
) sub
WHERE n.id = sub.id;
```

Mantiene el orden que cada usuario ve hoy (`created_at DESC`) — FR-011.

### Reglas de validación

- `PUT /notes/order`: `ids` es un array no vacío de UUIDs, sin duplicados.
- Todos los `ids` DEBEN pertenecer al usuario autenticado; si alguno no, se responde 400
  y no se modifica nada.
- Las notas del usuario que no vengan en `ids` (p. ej. creadas desde otro dispositivo)
  conservan su `position` y quedan después (se les suma `ids.length` para evitar empates).
- `POST /notes`: la nota nueva recibe `position = MAX(position del usuario) + 1`
  (0 si no tiene notas) — FR-012.
- `DELETE /notes/:id`: no renumera; los huecos no afectan el orden.

### Orden de lectura

`GET /notes` → `ORDER BY position ASC, created_at DESC`.

## Transiciones de estado (reordenar)

```text
idle (waitingResponse = "none")
  │ onDragEnd(active ≠ over)
  ▼
optimista: notes = moveNote(notes, active, over)
  │
  ├─ offline ─► localStorage.setItem ─┬─ ok ──► idle
  │                                   └─ error ► notes = anterior, reorderError = msg ► idle
  │
  └─ online ─► waitingResponse = "reorderingNotes" ─► PUT /notes/order
                                      ├─ ok ──► waitingResponse = "none"
                                      └─ error ► notes = anterior, reorderError = msg,
                                                 waitingResponse = "none"
```
