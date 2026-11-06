# Quickstart: validar imágenes en pensamientos

**Feature**: [spec.md](./spec.md). **Contratos**: [API](./contracts/api-notes-content-list.md),
[Storage](./contracts/storage-thinking-images.md), [UI](./contracts/thinking-input-ui.md).
**Modelo**: [data-model.md](./data-model.md).

## Prerrequisitos

- Supabase (el proyecto de desarrollo) con los SQL `002-content-list-typed.sql` y
  `003-storage-thinking-images.sql` aplicados, desde `thinking-notes-backend/prisma/sql/`.
- Backend con `parseContentList` corriendo, y `VITE_API_BASE_URL` en `.env.local`
  apuntando a ese backend.
- Dos cuentas de Google (A y B) para la prueba de aislamiento.
- Capturas de pantalla para pegar:
  - una de 1920×1080;
  - un PNG con transparencia;
  - un GIF animado;
  - un archivo de más de 20 MB (por ejemplo, una foto panorámica);
  - una imagen chica de 200×200.
- Un celular Android con Chrome. iOS Safari es opcional (ver la limitación R6).

## Gates automáticos

```bash
npm test
```

```bash
npm run build
```

```bash
npm run lint
```

Esperado:

- Tests verdes: `parseThinkings` y migración local, `extractImageFiles`,
  `computeTargetSize` y elección de formato, `localImageStore` (con `fake-indexeddb`),
  `remoteImageStore` (Supabase mockeado), cola de borrados y limpieza, contexto en los dos
  modos (subida OK, rollback ante falla, borrar pensamiento o nota, quitar imágenes al
  editar), búsqueda, copia y Markdown con imágenes, PDF con la imagen faltante.
- Build OK y lint sin errores nuevos.

Backend (`thinking-notes-backend`): `npm test`, con los tests de `parseContentList` (cada
fila de la tabla de reglas del contrato).

## Migración

1. Antes de migrar, anotar desde la app los textos de 2 notas locales y 2 remotas.
2. Aplicar el SQL 002. La consulta de verificación del contrato debe dar `0`. Aplicarlo de
   nuevo no debe cambiar nada.
3. Abrir la app nueva, en los dos modos: los textos y el orden son idénticos (SC-002).
   Recargar dos veces no cambia ni duplica nada.

## Verificación manual: sin sesión

1. Abrir una nota y pegar la captura de 1920×1080: aparece en la vista previa. Enviar: se
   crea un pensamiento con la miniatura. Recargar: sigue ahí (Historias 1 y 4).
2. En DevTools → Application → IndexedDB → `thinking-notes-images`, el blob pesa menos de
   500 KB (SC-003). En `localStorage["notes"]` solo aparece `local:<uuid>`, sin base64
   (FR-009).
3. Pegar 3 imágenes, quitar la segunda, escribir "prueba" y enviar: queda un pensamiento
   con 2 imágenes y el texto "prueba".
4. Pegar 6 imágenes: entran 5 y aparece el aviso del límite.
5. Pegar texto común: se pega el texto y no aparece vista previa.
6. Pegar el archivo de más de 20 MB: aparece el mensaje del límite y no entra a la vista
   previa.
7. Las imágenes especiales:
   - el PNG con transparencia la conserva en la vista previa y en la miniatura;
   - el GIF queda estático;
   - la imagen de 200×200 no se agranda.
8. Tocar una miniatura: se abre en grande. Probar ← → y Escape; el foco vuelve a la
   miniatura.
9. Editar el pensamiento de 2 imágenes:
   - quitar una y confirmar: queda 1 y el blob quitado desaparece de IndexedDB;
   - repetir pero cancelando: no cambia nada.
10. Editar ese pensamiento, quitar la última imagen y confirmar con el texto: queda como
    pensamiento de texto. Con otro pensamiento sin texto, hacer lo mismo: se borra.
11. Borrar la nota completa: IndexedDB queda sin los blobs de esa nota (SC-004).
12. Buscar dentro de la nota "prueba": encuentra el texto que acompaña a las imágenes.
13. Copiar la nota y exportarla a Markdown: aparece "[Imagen]" en su posición. Exportar a
    PDF: aparecen las imágenes, con salto de página si no entran (Historia 6).

## Verificación manual: con sesión

1. Repetir los pasos 1, 3, 8, 9 y 11. Verificar en Supabase → Storage →
   `thinking-images/<uid>/<noteId>/` que los archivos aparecen y desaparecen. En la tabla
   `notes`, `content_list` tiene rutas y no binarios.
2. Abrir la misma nota en otro navegador con la misma cuenta: se ven las imágenes.
3. En DevTools → Network → Offline, pegar y enviar: aparece "No se pudo subir…", la vista
   previa se conserva y la nota no cambia. Volver online y reenviar: funciona (Historia 4,
   escenario 4).
4. Offline, borrar un pensamiento con imágenes: desaparece de la lista. Volver online y
   recargar: el archivo se borra del bucket (cola de pendientes, FR-022).
5. Aislamiento (SC-005): con el token de B, intentar `download` o `createSignedUrl` de una
   ruta de A (desde la consola, con el cliente Supabase). Tiene que fallar.
6. Desde la API, mandar un `PUT /notes/:id` con una referencia `otroUsuario/...`: responde
   `400 Referencia de imagen inválida`.

## Verificación manual: celular (PWA)

1. En Android/Chrome, copiar una imagen y usar "Pegar" desde el portapapeles de Gboard en
   el campo: aparece la vista previa.
2. Deslizar para pasar de imagen en el visor.
3. Una nota con 20 imágenes se desplaza con fluidez y se puede escribir sin bloqueos
   (SC-006).
4. La PWA se sigue instalando y actualizando sola (Restricción PWA).
