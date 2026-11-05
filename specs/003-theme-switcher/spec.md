# Especificación de Funcionalidad: Selector de temas visuales

**Feature Branch**: `feat/theme-switcher`

**Created**: 2026-11-05

**Status**: Draft

**Input**: Descripción del usuario: "Como nueva feature, vamos a agregar un sistema de temas para la página web. Actualmente tenemos el tema clásico, que sería el tema azul, una especie de azul celestito. Y me gustaría agregar dos temas más, que sería el tema oscuro y un tercer tema que te lo dejo a elección. Sorpréndeme. Lo que se va a discutir en esta feature es que quiero que me recomiendes una posición de dónde puede estar este botón para cambiar los temas, que me des sugerencias. Yo me imagino que será el botón de alguna tuerca o un pincel, y cuando hagas clic se deploya un tooltip o un listado de opciones con los temas disponibles. Y los temas, al estar en una versión offline, se guardan en local storage. Y en la versión online también. De momento este tema vamos a guardarlo en el local storage. No vamos a crear un nuevo campo en la base de datos para almacenar el tema. De momento."

## Temas propuestos

| Tema | Nombre en la UI | Idea visual |
|------|-----------------|-------------|
| Clásico (actual, por defecto) | **Clásico** | Degradado de blanco a azul lavanda/celeste, tarjetas blancas, acento azul. Es el aspecto actual de la app, sin cambios. |
| Oscuro | **Oscuro** | Paleta del tema "Oscuro" de Discord (no "Ceniza"): carbón casi negro (`#121214` de fondo, `#1a1a1e` en el panel lateral y la nota), cuadro de texto `#222327`, menús `#252429`, texto casi blanco y acento violeta azulado `#5865f2`. Pensado para escribir de noche. |
| Tercer tema (elegido para sorprender) | **Atardecer** | Degradado cálido de durazno a coral con un toque lila arriba, tarjetas color crema y acento terracota. Un tema cálido y "de cuaderno" que contrasta con los dos fríos y conserva el estilo de degradado que ya identifica a la app. |

## Ubicación del botón: opciones evaluadas

El pedido incluye una recomendación sobre dónde ubicar el botón. Se evaluaron estas posiciones sobre el layout actual (panel lateral con usuario y botones circulares arriba; badge de versión fijo abajo a la izquierda):

| Opción | Ubicación | A favor | En contra |
|--------|-----------|---------|-----------|
| **A (recomendada)** | **Pie del panel lateral**: un botón circular con ícono de **paleta de pintor** abajo del listado de notas. Al hacer clic se despliega hacia arriba un pequeño menú con los tres temas, cada uno con una muestra de color y su nombre. Con el panel colapsado, el botón sigue visible al pie de la barra angosta. | Es el lugar donde casi todas las apps ponen las preferencias (abajo del panel), no compite con las acciones de nota (agregar/borrar) de arriba, está disponible con y sin sesión, y en celular queda al alcance del pulgar. | Suma un elemento al panel; hay que cuidar que no quite espacio útil a la lista en pantallas bajas. |
| B | **Arriba, junto a los botones circulares** (agregar, borrar, colapsar). | Cero layout nuevo: reutiliza el estilo de botón existente. | Mezcla una preferencia de la app con acciones sobre notas; esa barra ya tiene hasta 3 botones y en celular se aprieta. |
| C | **Botón flotante en la esquina inferior** (junto al número de versión). | Siempre visible, independiente del panel. | Flota sobre el área de escritura y la constitución pide una interfaz limpia centrada en escribir; en celular tapa contenido. |
| D | **Dentro del modal de perfil**. | No agrega nada a la pantalla principal. | El perfil solo existe con sesión: el usuario sin cuenta no podría cambiar el tema (viola la paridad offline/online). Descartada. |

Ícono: se recomienda la **paleta de pintor** por sobre la tuerca, porque comunica "apariencia" y no "configuración general"; si en el futuro se suman más preferencias, se puede cambiar por una tuerca sin alterar el comportamiento.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Cambiar el tema de la app (Prioridad: P1)

Como usuario, quiero abrir un selector de temas y elegir entre Clásico, Oscuro y Atardecer, para que la app se vea como prefiero según el momento del día o mi gusto.

**Por qué esta prioridad**: es el núcleo de la funcionalidad; sin poder elegir un tema no hay valor que entregar.

**Prueba independiente**: con la app abierta en el tema Clásico, abrir el selector, elegir "Oscuro" y comprobar que toda la interfaz (fondo, panel lateral, tarjetas de notas, cuadro de texto, botones, menús, modal de perfil y barras de desplazamiento) cambia al instante, sin recargar la página y sin perder lo que se estaba escribiendo.

**Escenarios de aceptación**:

1. **Dado** la app en el tema Clásico, **cuando** el usuario presiona el botón de temas, **entonces** se despliega una lista con los tres temas, cada uno con su nombre y una muestra de sus colores, y el tema activo aparece marcado.
2. **Dado** el selector abierto, **cuando** el usuario elige un tema, **entonces** la interfaz completa cambia a ese tema de inmediato y el selector se cierra.
3. **Dado** el selector abierto, **cuando** el usuario hace clic fuera de él, presiona Escape o vuelve a presionar el botón, **entonces** el selector se cierra sin cambiar el tema.
4. **Dado** que el usuario está escribiendo una nota con cambios pendientes de guardar, **cuando** cambia de tema, **entonces** el texto y el estado de guardado no se ven afectados.
5. **Dado** el selector de temas, **cuando** el usuario lo usa solo con teclado, **entonces** puede abrirlo, recorrer los temas, elegir uno y cerrarlo sin usar el mouse.

---

### Historia de Usuario 2 - El tema elegido se recuerda (Prioridad: P1)

Como usuario, quiero que la app recuerde el tema que elegí la próxima vez que la abra en ese mismo navegador, tanto si uso la app sin cuenta como con sesión iniciada.

**Por qué esta prioridad**: un tema que se pierde al recargar obliga a elegirlo cada vez y no aporta valor real; además la constitución exige paridad offline/online.

**Prueba independiente**: elegir "Atardecer", recargar la página y comprobar que la app abre directamente en Atardecer; repetir sin sesión y con sesión.

**Escenarios de aceptación**:

1. **Dado** que el usuario sin sesión eligió un tema, **cuando** recarga o vuelve a abrir la app en el mismo navegador, **entonces** la app se muestra con ese tema.
2. **Dado** que el usuario con sesión eligió un tema, **cuando** recarga o vuelve a abrir la app en el mismo navegador, **entonces** la app se muestra con ese tema.
3. **Dado** que el usuario eligió un tema, **cuando** inicia o cierra sesión, **entonces** el tema se mantiene.
4. **Dado** que el usuario eligió el tema Oscuro, **cuando** la app carga, **entonces** no se ve un destello del tema Clásico antes de aplicar el Oscuro.
5. **Dado** un usuario que nunca eligió un tema, **cuando** abre la app, **entonces** ve el tema Clásico, igual que hoy.

---

### Historia de Usuario 3 - Elegir el tema desde el celular (Prioridad: P2)

Como usuario de la PWA en el celular, quiero acceder al selector de temas con el pulgar y que el menú quepa en la pantalla, para cambiar el tema sin incomodidad.

**Por qué esta prioridad**: la app es una PWA pensada para celular, pero en escritorio la funcionalidad ya aporta valor por sí sola.

**Prueba independiente**: en una pantalla de celular, con el panel expandido y con el panel colapsado, abrir el selector, elegir un tema y comprobar que el menú se ve completo y no tapa el botón que lo abrió.

**Escenarios de aceptación**:

1. **Dado** la app en un celular con el panel expandido o colapsado, **cuando** el usuario busca el botón de temas, **entonces** está visible y tiene un área táctil cómoda.
2. **Dado** el selector abierto en un celular, **cuando** se despliega, **entonces** se muestra completo dentro de la pantalla, sin cortarse ni generar desplazamiento horizontal.
3. **Dado** la PWA instalada, **cuando** el usuario cambia a Oscuro, **entonces** la barra del sistema/navegador acompaña el color del tema donde el dispositivo lo permita.

### Edge Cases

- **Valor guardado inválido o de un tema que ya no existe**: la app usa el tema Clásico y no muestra errores.
- **Almacenamiento local no disponible** (navegación privada estricta, almacenamiento bloqueado o lleno): el cambio de tema funciona durante la sesión actual; simplemente no se recuerda al recargar, sin errores visibles ni roturas.
- **Varias pestañas abiertas**: si el usuario cambia el tema en una pestaña, las demás lo adoptan al recargarse (sincronizarlas en vivo es deseable pero no obligatorio).
- **Panel colapsado**: el botón sigue accesible y el menú se despliega sin quedar recortado por la barra angosta.
- **Pantallas de poca altura**: el botón al pie del panel no debe tapar ni empujar fuera de vista las notas de la lista.
- **Elementos con colores fijos** (estado "guardado" en verde, errores en rojo, resaltados en amarillo, ícono de micrófono grabando): deben seguir siendo distinguibles y legibles en los tres temas.
- **Usuario con el sistema operativo en modo oscuro**: sin elección previa, la app abre en Clásico (ver Supuestos); no cambia sola de tema.

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: La app DEBE ofrecer exactamente tres temas: Clásico (el aspecto actual), Oscuro y Atardecer.
- **FR-002**: La app DEBE mostrar un botón de temas con ícono de paleta de pintor ubicado en el pie del panel lateral, visible tanto con el panel expandido como colapsado, y con y sin sesión iniciada. *(Opción A; ver "Ubicación del botón".)*
- **FR-003**: Al activar el botón, la app DEBE desplegar un menú con los temas disponibles, mostrando para cada uno su nombre en español y una muestra visual de sus colores, e indicando cuál está activo.
- **FR-004**: Al elegir un tema, la app DEBE aplicarlo de inmediato a toda la interfaz, sin recargar la página y sin alterar las notas, el texto en edición ni el estado de guardado.
- **FR-005**: El menú DEBE cerrarse al elegir un tema, al hacer clic/tocar fuera de él, al presionar Escape o al volver a activar el botón.
- **FR-006**: El botón y el menú DEBEN poder usarse con teclado y tener nombres accesibles (por ejemplo, "Cambiar tema") para lectores de pantalla.
- **FR-007**: La app DEBE guardar el tema elegido en el almacenamiento local del navegador, tanto en modo sin sesión como con sesión, y NO DEBE guardarlo en la base de datos remota.
- **FR-008**: Al cargar, la app DEBE aplicar el tema guardado antes de mostrar la interfaz, evitando un destello del tema Clásico.
- **FR-009**: Si no hay un tema guardado, o el guardado no es válido, la app DEBE usar el tema Clásico.
- **FR-010**: Si el almacenamiento local no está disponible, el cambio de tema DEBE seguir funcionando durante la sesión actual sin mostrar errores.
- **FR-011**: Cada tema DEBE cubrir todas las superficies de la interfaz: fondo general, panel lateral, tarjetas de notas, contenido de la nota y cuadro de texto, botones, menús desplegables (descarga, temas), modal de perfil, avisos de estado, número de versión y barras de desplazamiento.
- **FR-012**: En cada tema, el texto principal DEBE tener un contraste suficiente para leerse con comodidad (nivel AA de accesibilidad web), y los indicadores de estado (guardado, pendiente, error, grabando) DEBEN seguir distinguiéndose.
- **FR-013**: El tema Clásico DEBE verse igual que la app actual; implementar los temas no debe introducir cambios visuales para quien no elige otro tema.
- **FR-014**: El cambio de tema DEBE tener una transición sutil que no bloquee la interacción.
- **FR-015**: Cuando la app corre como PWA o en navegadores móviles, el color de la barra del navegador/sistema DEBERÍA acompañar el tema activo donde el dispositivo lo soporte.
- **FR-016**: Los cambios NO DEBEN romper la instalación ni la actualización automática de la PWA.

### Key Entities

- **Tema**: un aspecto visual de la app. Atributos: identificador estable, nombre visible en español, muestra de colores para el menú y paleta completa (fondo, superficies, texto, acento, estados).
- **Preferencia de tema**: el tema elegido por quien usa ese navegador. Se guarda localmente en el dispositivo, es independiente de la cuenta y de la sesión, y tiene como valor por defecto el tema Clásico.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un usuario puede cambiar de tema en 2 interacciones (abrir el selector y elegir) y en menos de 5 segundos.
- **SC-002**: El nuevo tema se ve aplicado en toda la interfaz de forma instantánea para el usuario (sin recarga ni espera perceptible).
- **SC-003**: El 100 % de las recargas y reaperturas en el mismo navegador muestran el último tema elegido, en modo sin sesión y con sesión.
- **SC-004**: En ninguna carga de la app se observa un destello de otro tema antes del elegido.
- **SC-005**: En los tres temas, el 100 % del texto principal alcanza el contraste mínimo AA, y ninguna superficie de la interfaz queda con colores del tema anterior.
- **SC-006**: En la verificación manual, el selector se abre, se ve completo y se usa con comodidad en una pantalla de celular de 360 px de ancho, con el panel expandido y colapsado.
- **SC-007**: Un usuario que nunca eligió tema no percibe ningún cambio visual respecto de la versión anterior.

## Supuestos

- La ubicación del botón es la Opción A (pie del panel lateral, ícono de paleta), **confirmada por el usuario** el 2026-11-05. Con el panel colapsado, el botón se suma dentro de la cápsula colapsada.
- El tercer tema es **Atardecer** (cálido: durazno, coral y terracota), elegido por el equipo de desarrollo a pedido del usuario.
- El tema por defecto es Clásico; en esta versión la app no sigue automáticamente la preferencia claro/oscuro del sistema operativo, para no cambiarle el aspecto a quien no eligió nada.
- La preferencia se guarda por navegador/dispositivo: no se sincroniza entre dispositivos aunque haya sesión. Guardarla en la cuenta queda fuera de alcance "de momento", según lo pedido.
- El tema solo cambia colores (y sombras/degradados asociados); tipografía, tamaños y disposición de la interfaz no cambian.
- Los textos de la interfaz (nombres de temas, etiquetas accesibles) están en español.
- La pantalla de inicio de sesión de Google es externa y no se ve afectada por el tema.
- Verificación manual: recorrer los tres temas en escritorio y celular, con y sin sesión, revisando panel, notas, cuadro de texto, menús, modal de perfil y estados (guardado, error, dictado). La lógica de guardar/leer la preferencia se cubre con tests automatizados.
