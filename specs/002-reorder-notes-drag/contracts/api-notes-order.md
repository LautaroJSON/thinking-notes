# Contrato: API de orden de notas

**Repo**: `thinking-notes-backend` (NestJS + Prisma) · **Auth**: `Authorization: Bearer <supabase access token>` (guard `SupabaseAuthGuard`, igual que el resto de `/notes`).

## `PUT /notes/order` (nuevo)

Reasigna el orden de las notas del usuario en una única transacción.

> En el controller DEBE declararse **antes** de `@Put(':id')` para que `order` no se
> interprete como un `id`.

### Request

```json
{ "ids": ["7f0c…", "a12b…", "03de…"] }
```

| Campo | Tipo | Reglas |
|---|---|---|
| `ids` | `string[]` | Requerido, no vacío, UUIDs, sin duplicados. El índice en el array es la nueva `position`. |

### Respuestas

| Código | Cuándo | Body |
|---|---|---|
| `200` | Orden guardado | `{ "ids": ["7f0c…", "a12b…", "03de…"] }` (orden persistido) |
| `400` | Body inválido, duplicados, o algún `id` no pertenece al usuario | `{ "message": "…", "statusCode": 400 }` |
| `401` | Sin token / token inválido | `{ "message": "…", "statusCode": 401 }` |
| `500` | Error de base de datos | `{ "message": "No se pudo guardar el orden", "statusCode": 500 }` |

Ante cualquier error **no se modifica** ninguna posición (transacción).

## `GET /notes` (cambia el orden, no el shape)

Respuesta igual que hoy (`{ id, title, contentList }[]`), ordenada por
`position ASC, createdAt DESC`.

## `POST /notes` (cambia comportamiento, no el shape)

La nota creada recibe `position = MAX(position del usuario) + 1` → aparece al final.

## Cliente frontend (`src/services/service.ts`)

```ts
export const reorderNotesService = (ids: string[]): Promise<{ ids: string[] }>
// PUT /notes/order con body { ids }; usa fetchJson (autenticado).
```

Ninguna otra capa hace `fetch` directo (restricción técnica de la constitución).
