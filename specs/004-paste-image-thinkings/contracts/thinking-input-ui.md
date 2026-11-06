# Contrato de UI: pegar, ver y editar pensamientos con imágenes

Componentes de `src/components/notes/noteContent/components/`. Todos los textos están en
español.

## Input de nuevo pensamiento (`activeNoteView.tsx` + `ImagePreviewTray`)

| Situación | Comportamiento |
|---|---|
| Se pega contenido con imagen(es) | `preventDefault`. Cada imagen se comprime y entra a la bandeja de vista previa en el orden pegado, hasta 5. Mientras se comprime se ve un placeholder con spinner. |
| Se pega contenido sin imágenes | Comportamiento actual (se pega el texto). |
| Hay más de 5 | Se agregan las que entran y se muestra el aviso "Podés adjuntar hasta 5 imágenes por pensamiento". |
| Se pulsa la ✕ de una miniatura (`aria-label="Quitar imagen N"`) | Se quita solo esa imagen. |
| Botón de enviar | Habilitado si hay texto o al menos 1 imagen y no hay una subida en curso. |
| Enter / enviar | Crea un único pensamiento con las imágenes y el texto (si lo hay). Durante la subida, el botón muestra un spinner y se deshabilita. |
| Error de subida | Mensaje en línea `role="alert"`. La bandeja y el texto se conservan. |
| Cambiar de nota | Cada nota conserva su bandeja (como el borrador de texto); al volver, las imágenes siguen ahí. Al borrar la nota se descartan y se revocan sus object URLs. |

Dictado: sigue igual; el texto dictado va como texto acompañante si hay imágenes.

## Pensamiento en la lista (`ThinkingItem`)

| Tipo | Render |
|---|---|
| `text` | Igual que hoy. |
| `image` | Grupo de miniaturas: 1 imagen ocupa el ancho de la columna (alto máximo de unos 240 px); 2 a 5 van en una grilla de 2 a 3 columnas, recortadas con `object-fit: cover`. Debajo, el texto acompañante si lo hay. Cada miniatura es un `<button>` con `aria-label="Ver imagen N de M"`. |
| desconocido | "Contenido no soportado en esta versión". Se puede borrar. |

- **Mientras carga**: un placeholder con la proporción final, para que la lista no salte.
  El ancho y el alto se toman del `<img>` cuando carga; mientras tanto se reserva una
  caja cuadrada fija.
- **Si falla la carga**: "Imagen no disponible".
- **Acciones**: el botón de borrar es el mismo que en los pensamientos de texto. El botón
  de editar abre el modo edición.

## Modo edición de un pensamiento con imágenes

- El texto acompañante se edita en un `textarea`, igual que un pensamiento de texto.
- Cada miniatura muestra una ✕ (`aria-label="Quitar imagen N"`). La imagen quitada se
  oculta del borrador de edición.
- No hay forma de agregar imágenes: pegar una imagen en este `textarea` no hace nada
  especial.
- **Confirmar**: aplica las reglas de [data-model.md](../data-model.md), sección
  "Pensamiento con imágenes al editarlo".
- **Cancelar** (Escape o el botón): descarta los cambios.

## Visor ampliado (`ImageViewer`, `<dialog>`)

- Se abre al tocar una miniatura y muestra la imagen N del pensamiento.
- Se cierra con el botón ✕ (`aria-label="Cerrar"`), con clic en el fondo o con Escape. Al
  cerrar, el foco vuelve a la miniatura que lo abrió.
- Si hay más de una imagen: botones ‹ › (`aria-label="Imagen anterior/siguiente"`),
  flechas ← → y deslizar horizontalmente (umbral de 50 px). Se ve el indicador "N / M".
- La imagen se muestra con `object-fit: contain`, ocupando como máximo el 90 % del alto y
  del ancho de la pantalla.
- Con sesión, se usa la URL firmada, sin descargar de nuevo si ya está en caché.

## Estado de guardado

Se mantiene el indicador actual ("Guardando…" / "Guardado"). La subida cuenta como
"Guardando…" (`waitingResponse = "uploadingImages"`).
