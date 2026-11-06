# Contrato: almacenamiento de imágenes

Las dos implementaciones cumplen la misma interfaz del frontend
(`src/services/images/imageStore.ts`):

```ts
interface ImageStore {
  /** Guarda el blob y devuelve su referencia. */
  save(blob: Blob, ctx: { noteId: string }): Promise<ImageRef>;
  /** URL que se puede mostrar en <img> (object URL o URL firmada). */
  getUrls(refs: ImageRef[]): Promise<Map<ImageRef, string>>;
  /** Blob para exportar a PDF. */
  getBlob(ref: ImageRef): Promise<Blob>;
  /** Borra; si el archivo no existe no es un error. */
  remove(refs: ImageRef[]): Promise<void>;
  /** Referencias de la nota que existen en el almacenamiento, con fecha de alta (limpieza de respaldo). */
  listForNote?(noteId: string): Promise<{ ref: ImageRef; createdAt: number }[]>;
}
```

Para elegir el almacenamiento: `resolveImageStore(ref)` devuelve el local si la referencia
empieza con `local:` y el remoto en cualquier otro caso. `storeForMode(isLogged)` decide
dónde guardar las imágenes nuevas.

## Local: IndexedDB

- Base `thinking-notes-images` (versión 1), object store `images`, clave = uuid.
- Valor: `{ data: ArrayBuffer, type: string, createdAt: number }`. Se guarda el contenido en lugar del `Blob` porque Safari tuvo problemas para guardar Blobs en IndexedDB.
- Referencia: `local:<uuid>`.
- `getUrls` usa `URL.createObjectURL`. Las URLs quedan en caché por sesión y se revocan al
  borrar el archivo.
- Si el navegador se queda sin espacio (`QuotaExceededError`), se muestra el mensaje de
  espacio insuficiente (research R12).

## Nube: Supabase Storage

### Bucket (SQL `prisma/sql/003-storage-thinking-images.sql`, en el backend)

```text
id/name:            thinking-images
public:             false
file_size_limit:    2097152   (2 MB)
allowed_mime_types: image/webp, image/jpeg, image/png
```

### Políticas RLS sobre `storage.objects`

| Operación | Rol | Condición |
|---|---|---|
| `SELECT` | `authenticated` | `bucket_id = 'thinking-images' AND (storage.foldername(name))[1] = auth.uid()::text` |
| `INSERT` | `authenticated` | igual (`WITH CHECK`) |
| `DELETE` | `authenticated` | igual |
| `UPDATE` | — | sin política: los archivos no se reemplazan |

`anon` no tiene acceso.

### Operaciones (cliente `supabase` con la sesión del usuario)

| Método | Llamada |
|---|---|
| `save` | `storage.from(bucket).upload("<uid>/<noteId>/<uuid>.<ext>", blob, { contentType, upsert: false, cacheControl: "3600" })` |
| `getUrls` | `createSignedUrls(paths, 3600)`, una llamada por nota, con caché en memoria y renovación si quedan menos de 300 s |
| `getBlob` | `download(path)` |
| `remove` | `remove(paths)`; un 404 se considera éxito |
| `listForNote` | `list("<uid>/<noteId>")` |
| borrar nota | `list("<uid>/<noteId>")` y luego `remove(todos)` |

### Pruebas de aislamiento (SC-005)

Con dos usuarios A y B:

- B no puede hacer `download`, `createSignedUrl` ni `remove` sobre una ruta `A/...`.
- B no puede subir a `A/...`.
- Las cuatro operaciones tienen que fallar con error de permisos o "not found".
