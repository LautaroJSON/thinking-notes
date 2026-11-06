# Especificación de Funcionalidad: Pegar imágenes como pensamientos de una nota

**Feature Branch**: `feat/paste-image-thinkings`

**Created**: 2026-11-06

**Status**: Draft

**Input**: Descripción del usuario: "Quiero que el usuario pueda pegar imágenes (capturas de pantalla u otras imágenes del portapapeles) en el input de pensamientos de una nota, y que cada imagen se guarde como un pensamiento más dentro de la nota, al estilo de cuando se adjunta una imagen en el chat de una app de escritorio de IA." (descripción completa con comportamiento esperado, cambio de modelo de datos, restricciones técnicas y fuera de alcance en el pedido original del `/speckit-specify`).

## Clarifications

### Session 2026-11-06

- Q: ¿Reordenar los pensamientos arrastrándolos entra en esta feature o va en una aparte? → A: Se descarta por completo, ni en esta ni en ninguna otra feature.
- Q: Si al confirmar hay texto escrito y una imagen en la vista previa, ¿el texto se guarda como pensamiento aparte o como descripción de la imagen? → A: Un pensamiento puede tener solo texto, solo imagen, o una imagen con texto que la acompaña; el texto escrito junto a la imagen forma parte del mismo pensamiento.
- Q: Si el usuario pega varias imágenes antes de enviar, ¿se guardan como un solo pensamiento o uno por imagen? → A: Como en la app de escritorio de Claude: se pueden pegar varias imágenes, se ven todas en la vista previa y se guardan juntas (con el texto, si hay) en un único pensamiento; límite de 5 imágenes por pensamiento.
- Q: Después de guardar un pensamiento con imágenes, ¿se le pueden agregar o quitar imágenes al editarlo? → A: Al editar se pueden quitar imágenes de a una, pero no agregar nuevas; si se quitan todas y no hay texto, se borra el pensamiento.
- Q: ¿La API nueva debe aceptar el formato anterior (lista de textos) enviado por versiones viejas de la app? → A: No: todavía no hay usuarios reales, así que no hace falta compatibilidad con versiones viejas; la API y la app usan solo el formato nuevo.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Pegar una imagen y guardarla como pensamiento (Prioridad: P1)

Como usuario, quiero pegar una captura de pantalla (u otra imagen copiada) en el campo donde escribo pensamientos, ver una vista previa y, al confirmar, que quede guardada como un pensamiento más de la nota, igual que cuando adjunto una imagen en el chat de una app de IA.

**Por qué esta prioridad**: es el núcleo de la funcionalidad; sin poder pegar y guardar una imagen no hay valor que entregar.

**Prueba independiente**: con una nota abierta, copiar una captura al portapapeles, pegarla en el campo de pensamientos, confirmar y ver que aparece al final de la lista como miniatura; recargar la página y comprobar que sigue ahí.

**Escenarios de aceptación**:

1. **Dado** una nota abierta y una imagen en el portapapeles, **cuando** el usuario pega (Ctrl+V / Cmd+V en escritorio, o "Pegar" desde el menú contextual en el celular) en el campo de pensamientos, **entonces** aparece una vista previa de la imagen junto al campo, sin guardarse todavía; si pega más imágenes (en el mismo pegado o en pegados sucesivos), se suman a la vista previa en el orden pegado.
2. **Dado** una o más imágenes en vista previa, **cuando** el usuario pulsa el botón de quitar de una de ellas, **entonces** solo esa imagen desaparece de la vista previa y no se guarda nada.
3. **Dado** una o más imágenes en vista previa, **cuando** el usuario confirma (Enter o el botón de enviar, igual que con un pensamiento de texto), **entonces** todas se guardan juntas en un único pensamiento nuevo al final de la nota, en el orden de la vista previa, y la vista previa se limpia.
4. **Dado** que el usuario tiene texto escrito y una o más imágenes en vista previa, **cuando** confirma, **entonces** se crea un único pensamiento al final de la nota con las imágenes y el texto que las acompaña.
5. **Dado** que el portapapeles contiene solo texto, **cuando** el usuario pega en el campo de pensamientos, **entonces** el texto se pega como hasta ahora y no aparece ninguna vista previa.
6. **Dado** que la imagen se está guardando, **cuando** el usuario mira la nota, **entonces** ve el estado "Guardando…" y luego "Guardado", igual que con el resto de los cambios.
7. **Dado** que ya hay 5 imágenes en vista previa, **cuando** el usuario pega otra, **entonces** no se agrega y ve el aviso "Podés adjuntar hasta 5 imágenes por pensamiento".

---

### Historia de Usuario 2 - Ver las imágenes en la nota (Prioridad: P1)

Como usuario, quiero ver los pensamientos de imagen como miniaturas dentro de la lista y poder abrirlos en grande al tocarlos.

**Por qué esta prioridad**: guardar una imagen que no se puede ver no aporta valor; va de la mano con la historia 1.

**Prueba independiente**: con una nota que tiene pensamientos de texto e imagen, ver que las imágenes aparecen como miniaturas en su posición; tocar una y verla ampliada; cerrarla y volver a la nota.

**Escenarios de aceptación**:

1. **Dado** una nota con pensamientos de imagen, **cuando** se abre la nota, **entonces** cada pensamiento con imágenes muestra sus miniaturas agrupadas (en fila, o en grilla si son varias) en su posición dentro de la lista, con su texto acompañante debajo si lo tiene, intercalado con los pensamientos de solo texto.
2. **Dado** una miniatura, **cuando** el usuario la toca o hace clic, **entonces** la imagen se abre en grande ocupando la mayor parte de la pantalla.
3. **Dado** una imagen abierta en grande, **cuando** el usuario la cierra (botón de cerrar, tocar fuera de la imagen o Escape en escritorio), **entonces** vuelve a la nota en el mismo lugar donde estaba.
6. **Dado** un pensamiento con varias imágenes abierto en grande, **cuando** el usuario usa los controles de anterior/siguiente (o las flechas del teclado, o desliza en el celular), **entonces** pasa a las otras imágenes del mismo pensamiento.
4. **Dado** que una imagen todavía se está cargando, **cuando** se muestra la nota, **entonces** su lugar muestra un indicador de carga del mismo tamaño que la miniatura, sin que la lista "salte".
5. **Dado** que una imagen no se puede cargar (archivo inexistente o error de red), **cuando** se muestra la nota, **entonces** su lugar muestra un aviso de "Imagen no disponible" y el pensamiento se puede seguir borrando.

---

### Historia de Usuario 3 - Borrar imágenes sin dejar archivos huérfanos (Prioridad: P1)

Como usuario, quiero borrar un pensamiento de imagen (o la nota entera) como cualquier otro pensamiento, y que la imagen se elimine de verdad del almacenamiento.

**Por qué esta prioridad**: las imágenes ocupan espacio (cuota del navegador o almacenamiento en la nube); dejar archivos sin uso desperdicia espacio y, con sesión, conserva datos que el usuario quiso borrar.

**Prueba independiente**: pegar una imagen, borrarla y verificar que el archivo ya no existe en el almacenamiento correspondiente (navegador sin sesión, nube con sesión); repetir borrando la nota completa que contiene varias imágenes.

**Escenarios de aceptación**:

1. **Dado** un pensamiento de imagen, **cuando** el usuario lo borra con el mismo botón que los de texto, **entonces** desaparece de la lista y se eliminan del almacenamiento los archivos de todas sus imágenes.
2. **Dado** una nota con varios pensamientos de imagen, **cuando** el usuario borra la nota, **entonces** se eliminan todos sus archivos de imagen.
3. **Dado** un pensamiento con varias imágenes en modo edición, **cuando** el usuario quita una imagen y confirma la edición, **entonces** esa imagen desaparece del pensamiento, su archivo se elimina del almacenamiento y las demás imágenes y el texto se conservan.
4. **Dado** que la eliminación del archivo falla (por ejemplo, sin conexión), **cuando** ocurre el error, **entonces** el pensamiento o la nota se borran igual para el usuario y el archivo queda registrado como pendiente de eliminar, para reintentarlo automáticamente más adelante.
5. **Dado** una imagen en vista previa que el usuario quita sin confirmar, **cuando** la quita, **entonces** no queda ningún archivo guardado en ningún almacenamiento.

---

### Historia de Usuario 4 - Funciona con y sin sesión (Prioridad: P1)

Como usuario, quiero pegar y ver imágenes tanto si uso la app sin cuenta como con sesión iniciada.

**Por qué esta prioridad**: la constitución exige paridad offline/online (principio I, no negociable).

**Prueba independiente**: repetir las historias 1–3 en modo sin sesión y con sesión; en ambos casos las imágenes sobreviven a recargar la página.

**Escenarios de aceptación**:

1. **Dado** un usuario sin sesión, **cuando** pega y confirma una imagen y recarga la página, **entonces** la imagen sigue en la nota, sin necesidad de red ni de cuenta.
2. **Dado** un usuario con sesión, **cuando** pega y confirma una imagen, **entonces** la imagen queda en su cuenta y la ve también desde otro dispositivo o navegador con la misma cuenta.
3. **Dado** un usuario con sesión, **cuando** otro usuario intenta acceder al archivo de su imagen, **entonces** el acceso es denegado: cada usuario solo puede ver y borrar sus propias imágenes.
4. **Dado** un usuario con sesión, **cuando** la subida de la imagen falla, **entonces** ve un mensaje de error claro, la imagen queda en la vista previa para reintentar o quitarla, y la nota no queda con un pensamiento roto.

---

### Historia de Usuario 5 - Las notas existentes siguen funcionando (Prioridad: P1)

Como usuario que ya tiene notas, quiero que después de esta actualización todas mis notas y pensamientos sigan estando, en el mismo orden, sin hacer nada.

**Por qué esta prioridad**: el cambio de formato de los pensamientos afecta a todas las notas; perder datos sería el peor resultado posible.

**Prueba independiente**: con notas creadas en la versión anterior (locales y remotas), actualizar la app y comprobar que todos los pensamientos aparecen con el mismo texto y en el mismo orden, y que se pueden editar, borrar y exportar.

**Escenarios de aceptación**:

1. **Dado** notas locales guardadas con el formato anterior, **cuando** el usuario abre la nueva versión, **entonces** todos sus pensamientos se convierten automáticamente a pensamientos de texto, con el mismo contenido y orden.
2. **Dado** notas remotas guardadas con el formato anterior, **cuando** el usuario con sesión abre la nueva versión, **entonces** ve todos sus pensamientos intactos y en el mismo orden.
3. **Dado** que la conversión ya se hizo, **cuando** el usuario vuelve a abrir la app, **entonces** no se duplica ni altera ningún pensamiento (la conversión es idempotente).

---

### Historia de Usuario 6 - Exportar y copiar notas con imágenes (Prioridad: P3)

Como usuario, quiero exportar a PDF una nota que tiene imágenes y que las imágenes aparezcan en el documento; y que copiar o exportar a Markdown no se rompa.

**Por qué esta prioridad**: la exportación ya existe y no debe romperse; incluir las imágenes es deseable pero secundario.

**Prueba independiente**: exportar a PDF una nota con texto e imágenes y ver que el PDF incluye las imágenes en su posición; copiar la nota y exportarla a Markdown sin errores.

**Escenarios de aceptación**:

1. **Dado** una nota con pensamientos de texto e imagen, **cuando** el usuario la exporta a PDF, **entonces** el PDF incluye cada imagen en su posición, escalada al ancho de la página y respetando su proporción, y pasa de página si no entra.
2. **Dado** que una imagen no se pudo obtener al exportar, **cuando** se genera el PDF, **entonces** el documento se genera igual, con el texto "[Imagen no disponible]" en su lugar.
3. **Dado** una nota con imágenes, **cuando** el usuario la copia al portapapeles o la exporta a Markdown, **entonces** cada imagen aparece como el marcador de texto "[Imagen]" en su posición y el resto del contenido sale igual que hoy.

---

### Edge Cases

- **Varias imágenes en un solo pegado o pegados sucesivos**: cada imagen se agrega a la vista previa en el orden pegado, hasta 5; al confirmar, todas forman parte del mismo pensamiento. Si un pegado supera el límite, se agregan las que entran, se ignoran las sobrantes y se avisa.
- **Una imagen de varias falla al procesarse** (formato o tamaño): se rechaza solo esa, con su mensaje, y las demás quedan en la vista previa.
- **Portapapeles con imagen y texto a la vez** (por ejemplo, contenido copiado de una página web): se prioriza la imagen; si el portapapeles trae solo texto o HTML sin archivo de imagen, se pega como texto.
- **Formato no soportado** (por ejemplo, un archivo que no es imagen o un formato que el navegador no puede leer): no se agrega a la vista previa y se muestra "Solo se pueden pegar imágenes".
- **Imagen demasiado grande**: si la imagen original supera el tamaño máximo de entrada o, ya reducida, sigue superando el máximo por imagen, se rechaza con un mensaje claro que indica el límite.
- **Imagen animada (GIF)**: se guarda como imagen estática (primer cuadro).
- **Imagen muy pequeña**: no se agranda; se guarda con su tamaño original.
- **Imagen con transparencia**: se conserva la transparencia.
- **Sin espacio en el navegador** (modo sin sesión): se muestra un error claro, la imagen queda en la vista previa y no se crea el pensamiento.
- **Sin conexión con sesión iniciada**: la subida falla con un mensaje claro; la imagen queda en la vista previa para reintentar.
- **Cambiar de nota o cerrar la app con una imagen en vista previa**: la vista previa se descarta sin guardar nada (no se persiste como borrador).
- **Cerrar sesión**: las imágenes locales (sin sesión) quedan en el navegador asociadas a las notas locales, igual que hoy pasa con las notas.
- **Editar un pensamiento con imágenes**: el texto acompañante se puede agregar, editar o vaciar igual que un pensamiento de texto (si se vacía, queda como pensamiento de solo imágenes). En modo edición, cada imagen tiene un botón para quitarla; no se pueden agregar imágenes nuevas ni reemplazarlas. Si se quitan todas las imágenes y queda texto, el pensamiento pasa a ser de solo texto; si se quitan todas y no hay texto, el pensamiento se borra.
- **Cancelar la edición**: si el usuario cancela la edición, las imágenes que había marcado para quitar vuelven a aparecer y ningún archivo se elimina.
- **Búsqueda dentro de la nota**: el texto acompañante de un pensamiento con imagen participa de la búsqueda; la imagen en sí no.
- **Contador de ideas**: los pensamientos con imagen (con o sin texto) cuentan cada uno como una idea como ideas en el contador de la nota.
- **Tipo de pensamiento desconocido** (creado por una versión futura): se muestra un aviso genérico "Contenido no soportado en esta versión", se conserva sin modificarlo y se puede borrar.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

**Pegar y vista previa**

- **FR-001**: El sistema DEBE detectar cuando el usuario pega una o más imágenes en el campo de pensamientos de una nota, tanto con atajo de teclado como desde el menú de pegar del sistema en el celular.
- **FR-002**: El sistema DEBE mostrar cada imagen pegada como vista previa junto al campo, con un botón para quitarla, antes de guardarla.
- **FR-003**: El sistema DEBE mantener el comportamiento actual de pegado cuando el contenido pegado no incluye imágenes.
- **FR-004**: El sistema DEBE permitir hasta 5 imágenes por pensamiento (en la vista previa y, por lo tanto, en el pensamiento guardado), quitar cualquiera de ellas individualmente antes de confirmar, y avisar cuando se intente superar el límite.
- **FR-005**: Al confirmar, el sistema DEBE crear un único pensamiento con todas las imágenes de la vista previa, en el orden en que se pegaron, y con el texto escrito como texto acompañante si lo hay.
- **FR-006**: El botón de enviar DEBE estar habilitado cuando haya texto o al menos una imagen en vista previa.

**Procesamiento y límites**

- **FR-007**: El sistema DEBE reducir y comprimir cada imagen en el dispositivo antes de guardarla, de modo que su lado más largo no supere 1600 px y su peso típico quede en el orden de cientos de KB.
- **FR-008**: El sistema DEBE rechazar imágenes originales de más de 20 MB y, después de comprimir, imágenes de más de 2 MB, con un mensaje que indique el límite superado.
- **FR-009**: El sistema NUNCA DEBE guardar el contenido de la imagen codificado como texto dentro de las notas ni del almacenamiento de notas; las notas solo guardan una referencia al archivo.

**Almacenamiento según el modo**

- **FR-010**: Sin sesión, el sistema DEBE guardar el archivo de la imagen en el almacenamiento de archivos del navegador, separado de las notas, y la nota DEBE referenciarlo por un identificador.
- **FR-011**: Con sesión, el sistema DEBE subir el archivo al almacenamiento privado del usuario en la nube y la nota DEBE referenciarlo por su ruta.
- **FR-012**: Con sesión, cada usuario DEBE poder leer, subir y borrar únicamente los archivos de su propia carpeta; el acceso a imágenes ajenas DEBE ser denegado.
- **FR-013**: Con sesión, las imágenes DEBEN mostrarse mediante enlaces de acceso temporales; ningún enlace permanente y público DEBE exponer las imágenes.
- **FR-014**: El pensamiento con imágenes DEBE agregarse a la nota recién cuando todos sus archivos quedaron guardados correctamente; si falla el guardado de alguno, la nota no DEBE cambiar y los archivos que sí se guardaron en ese intento DEBEN eliminarse (o quedar como pendientes de eliminar, FR-022).
- **FR-015**: Si falla el guardado o la subida, el sistema DEBE mostrar un mensaje de error claro en español y conservar la imagen en la vista previa para reintentar o quitarla.

**Visualización**

- **FR-016**: Los pensamientos con imágenes DEBEN mostrar sus miniaturas agrupadas en su posición dentro de la lista de pensamientos, seguidas del texto acompañante si lo hay.
- **FR-017**: Al tocar una miniatura, el sistema DEBE abrir la imagen en grande, permitir pasar a las demás imágenes del mismo pensamiento (anterior/siguiente, flechas del teclado o deslizar) y cerrarla mediante botón, toque fuera de la imagen o Escape.
- **FR-018**: Mientras la imagen carga, el sistema DEBE mostrar un indicador que ocupe el mismo espacio que la miniatura; si no se puede cargar, DEBE mostrar "Imagen no disponible".
- **FR-019**: Las miniaturas y la vista ampliada DEBEN tener texto alternativo y poder abrirse y cerrarse con teclado.

**Borrado**

- **FR-020**: Al borrar un pensamiento con imágenes, el sistema DEBE eliminar los archivos de todas sus imágenes del almacenamiento correspondiente.
- **FR-020b**: Al editar un pensamiento con imágenes, el usuario DEBE poder quitar imágenes individualmente (sin agregar nuevas); al confirmar la edición, el sistema DEBE eliminar los archivos de las imágenes quitadas. Si no quedan imágenes, el pensamiento DEBE pasar a ser de solo texto o, si tampoco tiene texto, borrarse. Cancelar la edición NO DEBE eliminar ningún archivo.
- **FR-021**: Al borrar una nota, el sistema DEBE eliminar los archivos de todos sus pensamientos de imagen.
- **FR-022**: Si la eliminación de un archivo falla, el borrado DEBE completarse igual para el usuario y el archivo DEBE quedar registrado como pendiente, para reintentar su eliminación automáticamente en una próxima apertura de la app.
- **FR-023**: Quitar una imagen de la vista previa sin confirmar NO DEBE dejar ningún archivo guardado.

**Modelo de datos y migración**

- **FR-024**: Cada pensamiento DEBE representarse como un elemento con identificador propio, un tipo, un valor y un texto acompañante opcional; los tipos iniciales son "texto" (valor = el texto, sin texto acompañante) e "imagen" (valor = lista de 1 a 5 referencias a archivos, texto acompañante opcional).
- **FR-025**: El formato DEBE admitir tipos futuros (por ejemplo, audio o enlaces) sin cambiar su estructura; los elementos de tipo desconocido DEBEN conservarse intactos al guardar.
- **FR-026**: El sistema DEBE convertir automáticamente las notas locales con el formato anterior (lista de textos) al nuevo formato, sin perder contenido ni orden, y la conversión DEBE ser idempotente.
- **FR-027**: La API propia DEBE aceptar y devolver los pensamientos solo en el nuevo formato, y las notas remotas existentes DEBEN migrarse una única vez, sin pérdida de datos, antes de desplegar la nueva versión de la app. No se requiere compatibilidad con el formato anterior (ni en requests ni en responses).
- **FR-028**: La API DEBE validar los pensamientos recibidos: identificador y tipo presentes, valor de texto en pensamientos de texto, texto acompañante ausente o de texto y, para imágenes, una lista de 1 a 5 referencias sin repetir, todas pertenecientes a la carpeta del usuario autenticado.

**Exportación y copia**

- **FR-029**: La exportación a PDF DEBE incluir cada imagen en su posición, escalada al ancho útil de la página con su proporción y seguida de su texto acompañante si lo tiene, pasando de página cuando no entre; si una imagen no se puede obtener, DEBE escribir "[Imagen no disponible]" y continuar.
- **FR-030**: Copiar la nota y exportarla a Markdown DEBE representar cada imagen con el marcador "[Imagen]" en su posición, seguidos del texto acompañante si lo hay (por ejemplo, "[Imagen] [Imagen] captura del error").

### Contrato de datos (decidido por el usuario)

El cambio afecta a la app y a la API propia; el contrato conceptual es:

- **Pensamiento (Thinking)**: `{ id, type, value, text? }`
  - `id`: identificador único dentro de la nota, generado por la app al crear el pensamiento.
  - `type`: `"text"` | `"image"` (abierto a valores futuros).
  - `value`: texto, en pensamientos `"text"`; lista ordenada de 1 a 5 referencias a archivos (ruta en el almacenamiento de la nube con la forma `<idUsuario>/...`, o identificador local), en pensamientos `"image"`. Nunca el contenido binario ni codificado.
  - `text` (opcional): texto que acompaña a la imagen en pensamientos `"image"`; ausente o vacío si la imagen va sola. No se usa en pensamientos `"text"`. Tipos futuros (audio, enlaces) PUEDEN usarlo con el mismo sentido.
- **Nota remota**: el campo `contentList` pasa de lista de textos a lista de pensamientos con la forma anterior, en todas las operaciones (listar, crear, actualizar) y en todas las respuestas.
- **Migración remota**: cada texto existente `s` pasa a `{ id: <nuevo>, type: "text", value: s }`, conservando el orden.
- **Borrado de nota remota**: la eliminación de la nota no depende de que se puedan borrar sus archivos; los archivos que no se pudieron borrar siguen el mecanismo de pendientes (FR-022).

### Key Entities

- **Nota**: título, fechas y una lista ordenada de pensamientos. Su posición en el panel no cambia con esta funcionalidad.
- **Pensamiento**: elemento de la lista de una nota, con identificador, tipo, valor y texto acompañante opcional. Puede ser solo texto, solo imagen o imagen con texto. El orden en la lista es el orden en la nota.
- **Archivo de imagen**: binario comprimido de una imagen, guardado fuera de la nota (en el navegador sin sesión, en la carpeta privada del usuario en la nube con sesión). Pertenece a exactamente un pensamiento con imágenes; un pensamiento tiene de 1 a 5 archivos.
- **Archivo pendiente de eliminar**: referencia a un archivo cuya eliminación falló, que la app reintenta borrar más adelante.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un usuario puede pegar una captura y tenerla guardada en la nota en menos de 5 segundos (pegar + confirmar), con una conexión típica de celular 4G en modo con sesión.
- **SC-002**: El 100% de los pensamientos de las notas existentes (locales y remotas) se conservan con el mismo texto y orden después de la actualización.
- **SC-003**: Una captura de pantalla típica de escritorio (1920×1080) queda guardada con un peso menor a 500 KB.
- **SC-004**: Después de borrar pensamientos de imagen o notas con imágenes, no queda ningún archivo de imagen sin pensamiento asociado una vez completados los reintentos pendientes.
- **SC-005**: Un usuario no puede ver ni borrar ninguna imagen de otro usuario (0 accesos permitidos en pruebas de acceso cruzado).
- **SC-006**: Una nota con 20 imágenes se abre y muestra sus miniaturas sin bloquear el desplazamiento ni la escritura.
- **SC-007**: Exportar a PDF una nota con imágenes termina sin error en el 100% de los casos, incluso si alguna imagen no está disponible.
- **SC-008**: Todas las historias P1 se verifican manualmente en ambos modos (sin sesión y con sesión) en escritorio y celular.

## Assumptions

- Los pensamientos de imagen se agregan siempre al final de la nota y su posición queda fija, igual que los de texto: los pensamientos no se reordenan.
- Límites por defecto elegidos: hasta 5 imágenes por pensamiento, 20 MB máximo de imagen original, 2 MB máximo después de comprimir, 1600 px en el lado más largo.
- La vista previa no se persiste como borrador: si el usuario cambia de nota o recarga con imágenes sin confirmar, se descartan.
- El usuario sube imágenes solo en pensamientos nuevos; a un pensamiento existente no se le pueden agregar ni reemplazar imágenes (solo quitar), y un pensamiento de solo texto no puede pasar a tener imágenes.
- No hay un tope de imágenes por nota más allá del espacio disponible (cuota del navegador sin sesión, cuota del proyecto en la nube con sesión).
- Los pensamientos de texto existentes conservan su comportamiento actual (edición, copia, búsqueda).
- La API propia la mantiene el mismo equipo y se despliega coordinada con el frontend (primero la migración y la API, después la app).
- Todavía no hay usuarios reales: no hay que contemplar pestañas o instalaciones de versiones anteriores de la app que sigan enviando el formato viejo.
- El almacenamiento de archivos en la nube usa el mismo proveedor que ya da la autenticación, con un espacio privado por usuario.

## Preguntas Abiertas (fuera de alcance)

- **Sincronizar imágenes locales al iniciar sesión**: hoy, al iniciar sesión, la app pasa a mostrar las notas remotas; cómo (y si) se suben a la nube las notas e imágenes locales queda para una funcionalidad futura.
- Edición o recorte de imágenes: fuera de alcance.
- Adjuntar archivos que no sean imágenes: fuera de alcance.
- Reordenar pensamientos dentro de una nota: descartado de forma definitiva (no se hará en esta ni en otra feature).
- Adjuntar imágenes desde un selector de archivos o arrastrando un archivo al campo (en lugar de pegar): no pedido; candidato a mejora futura.
