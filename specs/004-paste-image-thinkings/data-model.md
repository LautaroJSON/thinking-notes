# Modelo de datos: Pegar imágenes como pensamientos

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## Entidades

### Nota (`INotes`, frontend)

| Campo | Tipo | Cambio |
|---|---|---|
| `id` | `string?` | sin cambios |
| `title` | `string` | sin cambios |
| `thinkings` | `Thinking[]` | **antes `string[]`** |
| `createdAt` / `updatedAt` | `string?` (ISO) | sin cambios |

Remoto: el campo `contentList` (columna `content_list jsonb`) pasa a guardar `Thinking[]`.
La columna, el tipo de la columna y la tabla no cambian, porque `jsonb` ya admite objetos.

### Pensamiento (`Thinking`)

Unión discriminada por `type` (ver R1):

| Tipo | `id` | `type` | `value` | `text` |
|---|---|---|---|---|
| Texto | UUID v4 | `"text"` | `string` (no vacío al crear) | — (no se usa) |
| Imagen | UUID v4 | `"image"` | `ImageRef[]`, de 1 a 5, sin repetir | `string?`, texto que acompaña a las imágenes |
| Desconocido | string | otro string | cualquiera | cualquiera; se conserva sin tocar |

**Reglas de validación** (iguales en `parseThinkings` del frontend y en
`parseContentList` del backend):

- `id` es un string no vacío y único dentro de la nota.
- En un pensamiento de imagen, `value` tiene entre 1 y 5 referencias.
- Un pensamiento de imagen sin `text` (o con `text` vacío) es un pensamiento de solo
  imágenes. Al guardar se omite `text` si queda vacío después de `trim()`.
- El orden del array es el orden de los pensamientos en la nota. No hay campo de posición,
  porque los pensamientos no se reordenan.

### Referencia a imagen (`ImageRef`)

String con dos formas (ver R2):

| Forma | Patrón | Almacenamiento |
|---|---|---|
| Local | `local:<uuid>` | IndexedDB `thinking-notes-images` → store `images`, clave `<uuid>` |
| Nube | `<userId>/<noteId>/<uuid>.(webp\|jpg\|png)` | Supabase Storage, bucket privado `thinking-images` |

### Archivo de imagen

| Campo | Local (IndexedDB) | Nube (Storage) |
|---|---|---|
| clave | `uuid` | ruta (ver arriba) |
| contenido | `data: ArrayBuffer` + `type: string` (se guarda el contenido, no el `Blob`, por compatibilidad entre navegadores) | objeto del bucket |
| tipo | `blob.type` | `contentType` en la subida |
| alta | `createdAt: number` (ms) | `created_at` de `storage.objects` |
| tamaño | ≤ 2 MB | ≤ 2 MB (también lo limita `file_size_limit` del bucket) |

Cada archivo pertenece a un solo `ImageThinking` y un pensamiento tiene de 1 a 5 archivos.

### Borrado pendiente (`PendingImageDeletion`, solo frontend)

`localStorage["pendingImageDeletions"]`: `ImageRef[]` sin repetir.

- Se agrega una referencia cuando sale de una nota (al borrar un pensamiento, quitar una
  imagen al editar o borrar una nota) o cuando falla el rollback de una subida.
- Se quita cuando se borra con éxito o cuando el archivo ya no existe (404 o clave
  inexistente).
- Nunca se borra una referencia que alguna nota cargada todavía usa.

### Imagen en vista previa (`PendingImage`, solo en memoria)

`{ localId: string; blob: Blob; previewUrl: string; width: number; height: number }`.
Vive en el estado del input. `previewUrl` es un object URL que se revoca al quitar la
imagen, al confirmar o al borrar la nota. Se guarda en memoria por nota (fuera del componente), así sobrevive al cambio de nota; no se persiste y se pierde al recargar (spec, Assumptions).

## Ciclos de vida

### Imagen desde que se pega

```text
pegada ──comprimir──► en vista previa ──quitar──► descartada (no se guardó nada)
   │                     │
   └─error──► rechazada  └─confirmar──► guardando ──todas OK──► en la nota ──► guardado de la nota
                                           │
                                           └─alguna falla──► rollback de las guardadas
                                                             (si falla: cola de pendientes)
                                                             y vuelve a la vista previa con error
```

### Archivo desde que se guarda

```text
en la nota ──quitar al editar / borrar pensamiento / borrar nota──► pendiente de borrar
pendiente de borrar ──(ninguna nota la referencia) + borrado OK──► eliminado
pendiente de borrar ──(alguna nota la referencia, p. ej. falló el guardado)──► se conserva
huérfano (sin nota, > 10 min) ──limpieza de respaldo──► eliminado
```

### Pensamiento con imágenes al editarlo

- Al quitar imágenes, la quita queda marcada pero no se aplica todavía.
- Al confirmar:
  - si quedan imágenes, se actualiza `value`;
  - si quedan 0 imágenes y hay texto, el pensamiento pasa a `{ type: "text", value: text }`
    y conserva el mismo `id`;
  - si quedan 0 imágenes y no hay texto, se borra el pensamiento.
- Las referencias quitadas pasan a la cola de pendientes.
- Al cancelar no cambia nada.

## Migraciones

| Origen | Mecanismo | Idempotencia |
|---|---|---|
| `localStorage["notes"]` con `thinkings: string[]` | `parseThinkings` al cargar y reescritura si hubo cambios | los objetos válidos no se tocan |
| `notes.content_list` con elementos string | SQL `002-content-list-typed.sql` (backend), una vez antes del deploy | solo convierte elementos `jsonb_typeof = 'string'` |

## Constantes

| Nombre | Valor |
|---|---|
| `MAX_IMAGES_PER_THINKING` | 5 |
| `MAX_INPUT_BYTES` | 20 MB |
| `MAX_OUTPUT_BYTES` | 2 MB |
| `MAX_SIDE_PX` | 1600 |
| `WEBP_QUALITY` / `JPEG_QUALITY` | 0.8 / 0.85 |
| `SIGNED_URL_TTL_S` | 3600 (se renueva si quedan menos de 300 s) |
| `ORPHAN_GRACE_MS` | 10 min |
| `IMAGES_BUCKET` | `thinking-images` |
