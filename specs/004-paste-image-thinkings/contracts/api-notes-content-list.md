# Contrato: `contentList` tipado en la API de notas

**Repo**: `thinking-notes-backend` (NestJS + Prisma). **Auth**: `Authorization: Bearer <supabase access token>`
(guard `SupabaseAuthGuard`, igual que el resto de `/notes`).

No se agregan endpoints. Cambia la forma de `contentList` en todos los requests y
responses de `/notes`. **No hay compatibilidad con el formato anterior** (spec,
aclaración 5).

## Tipo `Thinking`

```jsonc
// Texto
{ "id": "6b1e…-uuid", "type": "text", "value": "Una idea" }

// Imagen (1 a 5 referencias); "text" es opcional
{
  "id": "c0a4…-uuid",
  "type": "image",
  "value": [
    "<userId>/<noteId>/9f2d…-uuid.webp",
    "<userId>/<noteId>/1a7c…-uuid.webp"
  ],
  "text": "Capturas del error"
}

// Tipo futuro: se acepta y se devuelve sin modificar
{ "id": "…", "type": "audio", "value": "…" }
```

### Reglas de validación (`parseContentList`, 400 si no se cumplen)

| Regla | Mensaje (400) |
|---|---|
| `contentList` es un array de objetos | `contentList debe ser una lista de pensamientos` |
| `id` es un string no vacío y no se repite en la nota | `Cada pensamiento necesita un id único` |
| `type` es un string no vacío | `Cada pensamiento necesita un tipo` |
| `type: "text"`: `value` es string y no lleva `text` | `Pensamiento de texto inválido` |
| `type: "image"`: `value` es un array de 1 a 5 strings sin repetir | `Un pensamiento puede tener entre 1 y 5 imágenes` |
| `type: "image"`: cada ref cumple `^<userId>/<noteId>/<uuid>\.(webp\|jpg\|png)$` con el usuario autenticado y la nota del path | `Referencia de imagen inválida` |
| `type: "image"`: `text`, si viene, es string | `Pensamiento de imagen inválido` |
| `POST /notes`: no acepta pensamientos `image` | `Una nota nueva no puede incluir imágenes` |
| Cualquier elemento string, que es el formato anterior | `contentList debe ser una lista de pensamientos` |

Los demás tipos solo se validan con `id` y `type` y se guardan tal cual.

## Endpoints afectados

### `GET /notes`

`200`: `{ id, title, contentList: Thinking[], createdAt, updatedAt }[]`, con el orden
actual de las notas (sin cambios).

### `POST /notes`

```json
{ "title": "Nueva Nota :)", "contentList": [] }
```

`contentList` es opcional (por defecto `[]`) y solo admite pensamientos que no sean
`image`. Responde `201` con la nota completa (`NoteResponse`) o `400` según la tabla.

### `PUT /notes/:id`

```json
{ "title": "…", "contentList": [ /* Thinking[] */ ] }
```

Valida con `noteId = :id`. Responde `200` con la nota completa o `400` según la tabla. El
resto de los códigos (`401`, `404`, `500`) no cambia.

### `DELETE /notes/:id`

Sin cambios en el contrato. **No** borra archivos de Storage: eso lo hace el frontend
(research R7).

## Migración de datos

Archivo `prisma/sql/002-content-list-typed.sql`, que se aplica una vez en el SQL editor de
Supabase **antes** de desplegar el backend nuevo:

- Cada elemento string `s` de `content_list` pasa a
  `{"id": gen_random_uuid()::text, "type": "text", "value": s}`.
- Se conserva el orden (`WITH ORDINALITY`).
- Solo se actualizan filas con al menos un elemento string, así que es idempotente.
- Un `content_list` nulo pasa a `[]`.

Para comprobarlo: `SELECT count(*) FROM notes, jsonb_array_elements(content_list) e WHERE
jsonb_typeof(e) = 'string'` tiene que dar `0` después de aplicarlo.

## Orden de despliegue

1. SQL `002-content-list-typed.sql` y SQL `003-storage-thinking-images.sql` (ver
   [storage-thinking-images.md](./storage-thinking-images.md)).
2. Backend con `parseContentList`.
3. Frontend (Vercel).
