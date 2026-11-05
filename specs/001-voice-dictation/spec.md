# Feature Specification: Dictado por voz en la nota

**Feature Branch**: `001-voice-dictation`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Cuando estoy dentro de una nota, me gustaría tener un botón de un micrófono para tener una funcionalidad de speak to text. Similar a lo que estoy usando ahora con Claude Code. Esto en el modo escritorio debería funcionar, que al presionar, es un toggle, al presionar se empieza a autocompletar lo que voy diciendo. Y el mobile podemos hacer que tengas que mantener presionado para que se vaya logrando este speak to text."

## Clarifications

### Session 2026-11-05

- Q: En escritorio, con el micrófono activado, ¿qué pasa si el usuario se queda callado un rato? → A: Sigue escuchando hasta que vuelva a hacer clic; si el reconocimiento se corta por silencio, se reanuda solo de forma transparente.
- Q: ¿El micrófono sirve solo para ideas nuevas o también para editar ideas existentes? → A: Solo el campo de nueva idea, con un único botón de micrófono.
- Q: ¿En qué idioma reconoce el dictado? → A: Español fijo, variante rioplatense (Argentina).
- Q: ¿Qué pasa con el botón si el navegador no soporta dictado? → A: Se oculta; el botón no aparece en esos navegadores.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dictar una idea en escritorio con un botón toggle (Priority: P1)

Estando dentro de una nota en una computadora, el usuario hace clic en el botón de micrófono que está junto al campo para escribir una nueva idea. El botón queda visiblemente "activo" y, a medida que el usuario habla, el texto va apareciendo en el campo de la nueva idea. Cuando termina, vuelve a hacer clic en el botón para detener el dictado. El texto queda en el campo para revisarlo o corregirlo y lo confirma como siempre (Enter) para agregarlo como idea a la nota.

**Why this priority**: es el núcleo de la funcionalidad y el caso que el usuario describe primero. Por sí solo ya permite capturar ideas sin teclear, que es el valor principal.

**Independent Test**: en escritorio, abrir una nota, clic en el micrófono, decir una frase, clic de nuevo y verificar que la frase quedó en el campo de nueva idea; presionar Enter y verificar que se agrega a la nota y se guarda.

**Acceptance Scenarios**:

1. **Given** una nota abierta en escritorio y el micrófono inactivo, **When** el usuario hace clic en el botón de micrófono y concede el permiso, **Then** el botón muestra un estado de "escuchando" claramente distinguible y lo que el usuario dice empieza a aparecer en el campo de nueva idea.
2. **Given** el dictado activo, **When** el usuario sigue hablando, **Then** el texto se va completando de forma progresiva (incluyendo resultados provisorios que se corrigen a medida que se confirman) sin que el usuario tenga que hacer nada más.
3. **Given** el dictado activo, **When** el usuario vuelve a hacer clic en el botón, **Then** el dictado se detiene, el botón vuelve a su estado normal y el texto dictado queda en el campo, editable.
4. **Given** el campo de nueva idea ya tenía texto escrito a mano, **When** el usuario dicta, **Then** lo dictado se agrega a continuación del texto existente (separado por un espacio), sin borrarlo.
5. **Given** texto dictado en el campo, **When** el usuario presiona Enter, **Then** se agrega como una nueva idea a la nota y se guarda igual que una idea escrita a mano.

---

### User Story 2 - Dictar manteniendo presionado en celular (Priority: P2)

Estando dentro de una nota en el celular, el usuario mantiene presionado el botón de micrófono mientras habla. Mientras lo mantiene, el texto se va escribiendo en el campo de nueva idea. Al soltar el botón, el dictado se detiene y el texto queda listo para revisar y confirmar.

**Why this priority**: la app es una PWA pensada también para celular, donde dictar es todavía más útil que en escritorio. Depende del mismo mecanismo de dictado que la P1, cambiando sólo la forma de activarlo.

**Independent Test**: en un celular, abrir una nota, mantener presionado el micrófono, hablar, soltar y verificar que el texto quedó en el campo de nueva idea.

**Acceptance Scenarios**:

1. **Given** una nota abierta en un dispositivo táctil, **When** el usuario mantiene presionado el botón de micrófono, **Then** el botón muestra el estado "escuchando" y lo que dice aparece en el campo de nueva idea.
2. **Given** el dictado activo por presión sostenida, **When** el usuario suelta el botón, **Then** el dictado se detiene y el texto reconocido hasta ese momento queda en el campo.
3. **Given** el dictado activo por presión sostenida, **When** el dedo se desliza fuera del botón o el gesto se cancela, **Then** el dictado se detiene igual que al soltar, conservando lo reconocido.
4. **Given** un toque corto (sin mantener), **When** el usuario toca y suelta el micrófono rápidamente, **Then** no queda un dictado activo colgado y la app indica brevemente que hay que mantener presionado para dictar.
5. **Given** el usuario mantiene presionado el botón, **When** pasa el tiempo, **Then** el sistema operativo no abre menús contextuales, selección de texto ni zoom sobre el botón.

---

### User Story 3 - Avisos cuando el dictado no está disponible o falla (Priority: P3)

Si el navegador no permite dictar, el usuario rechazó el permiso del micrófono, no hay micrófono o hay un error durante el reconocimiento, la app se lo indica de forma clara y breve, sin perder lo que ya estaba escrito ni bloquear la escritura manual.

**Why this priority**: evita frustración y cumple con que nada falle en silencio, pero no aporta valor nuevo por sí sola.

**Independent Test**: denegar el permiso del micrófono (o usar un navegador sin soporte) y verificar el mensaje y que el resto de la nota sigue funcionando.

**Acceptance Scenarios**:

1. **Given** un navegador sin soporte de dictado, **When** el usuario abre una nota, **Then** el botón de micrófono no se muestra y la escritura manual funciona igual que hoy.
2. **Given** el usuario denegó el permiso de micrófono, **When** intenta dictar, **Then** ve un mensaje en español que explica que debe habilitar el micrófono, y el botón vuelve al estado normal.
3. **Given** el dictado activo, **When** ocurre un error de reconocimiento o se pierde la conexión necesaria para reconocer, **Then** el dictado se detiene, se conserva el texto ya reconocido y se muestra un aviso breve.

---

### Edge Cases

- **Cambio de nota durante el dictado**: si el usuario cambia de nota, cierra la nota o la app pasa a segundo plano mientras dicta, el dictado se detiene y no escribe texto en otra nota.
- **Silencio prolongado en escritorio**: si el reconocimiento se corta solo por silencio mientras el toggle sigue activo, se reanuda automáticamente sin perder el texto ya dictado y el botón sigue en "escuchando". Si no se puede reanudar (por ejemplo, por un error), el botón vuelve a inactivo y se avisa (FR-010); nunca debe mostrar "escuchando" cuando no se está escuchando.
- **Usuario escribe con el teclado mientras dicta**: el texto escrito a mano no se pierde ni se pisa con el dictado.
- **Enter durante el dictado**: si el usuario confirma la idea mientras el dictado está activo, la idea se agrega con lo reconocido hasta ese momento, el campo queda vacío y lo que siga dictando empieza una idea nueva.
- **Edición de una idea existente**: el dictado escribe sólo en el campo de nueva idea; no afecta una idea que se esté editando aunque tenga el foco (fuera de alcance en esta versión).
- **Buscador abierto**: abrir o usar el buscador de la nota no interfiere con el dictado ni el dictado escribe en el buscador.
- **Dispositivos híbridos** (pantalla táctil + mouse): el modo de activación se decide por el tipo de interacción usada (clic → toggle, presión táctil sostenida → mantener).
- **Nada reconocido**: si el usuario activa y detiene el dictado sin que se reconozca nada, el campo queda como estaba.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Dentro de una nota abierta, el sistema DEBE mostrar un único botón de micrófono junto al campo de nueva idea cuando el dispositivo y navegador permiten dictar. El dictado escribe siempre y sólo en ese campo, aunque el foco esté en otro lado.
- **FR-002**: Con mouse/teclado (escritorio), el botón DEBE funcionar como toggle: un clic inicia el dictado y otro clic lo detiene. Mientras el toggle está activo, el dictado DEBE continuar a través de pausas de silencio de cualquier duración, reanudando el reconocimiento automáticamente si se interrumpe, hasta que el usuario lo detenga (o se cumpla FR-010/FR-011).
- **FR-003**: En interacción táctil (celular), el dictado DEBE estar activo sólo mientras el usuario mantiene presionado el botón, y detenerse al soltar o cancelar el gesto.
- **FR-004**: Mientras el dictado está activo, el texto reconocido DEBE aparecer progresivamente en el campo de nueva idea, incluyendo resultados provisorios que se reemplazan por la versión final.
- **FR-005**: El texto dictado DEBE agregarse a continuación del contenido ya existente en el campo, sin borrarlo.
- **FR-006**: El dictado NO DEBE crear ideas automáticamente; el usuario confirma la idea con la acción habitual (Enter), y queda sujeta al mismo guardado automático que una idea escrita a mano.
- **FR-007**: El botón DEBE mostrar en todo momento un estado visual claro y fiel a la realidad: inactivo o escuchando. Si el navegador no soporta dictado, el botón NO DEBE mostrarse.
- **FR-008**: El botón DEBE ser accesible: tener una etiqueta en español, ser operable con teclado en escritorio y comunicar su estado (activo/inactivo) a tecnologías asistivas.
- **FR-009**: El reconocimiento DEBE usar siempre español, variante rioplatense (Argentina); no hay selector de idioma.
- **FR-010**: Si el permiso es denegado, no hay micrófono o ocurre un error, el sistema DEBE informar al usuario con un mensaje breve en español y volver a un estado consistente, sin perder el texto ya presente en el campo.
- **FR-011**: El dictado DEBE detenerse automáticamente al cambiar de nota, salir de la nota o cuando la app pierde el foco/pasa a segundo plano.
- **FR-012**: La funcionalidad DEBE comportarse igual con y sin sesión iniciada; no depende del login ni de la sincronización remota (el texto confirmado se guarda por el camino habitual de cada modo).
- **FR-013**: El sistema NO DEBE grabar ni almacenar el audio; sólo se conserva el texto que el usuario confirma.
- **FR-014**: En celular, mantener presionado el botón NO DEBE disparar menús contextuales, selección de texto ni zoom del sistema.

### Key Entities

- **Sesión de dictado**: período en el que el micrófono está escuchando. Atributos: estado (inactivo, escuchando, error), modo de activación (toggle o mantener presionado), texto provisorio y texto confirmado de esa sesión. No se persiste.
- **Idea (thinking)**: entidad existente de la nota; el dictado sólo produce texto para su campo de entrada, no cambia su forma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El usuario puede pasar de "nota abierta" a "estar dictando" con una sola acción (un clic en escritorio o presionar en celular).
- **SC-002**: Las primeras palabras dictadas aparecen en el campo en menos de 2 segundos desde que el usuario empieza a hablar, en condiciones normales.
- **SC-003**: En una prueba manual de 10 frases cortas en español dictadas en un ambiente silencioso, al menos 9 quedan transcritas con no más de una palabra a corregir.
- **SC-004**: En el 100% de los casos de error probados (sin soporte, permiso denegado, error en medio del dictado, cambio de nota), el texto previo del campo se conserva y el botón termina en un estado coherente.
- **SC-005**: La funcionalidad pasa la verificación manual en escritorio y en celular, tanto en modo sin sesión como con sesión.

## Assumptions

- El dictado escribe en el campo de **nueva idea** de la nota abierta; dictar sobre el título o sobre ideas existentes queda fuera del alcance de esta versión.
- El usuario revisa y confirma el texto (Enter); no se envía la idea automáticamente al terminar de dictar.
- "Escritorio" y "celular" se distinguen por el tipo de interacción (mouse/teclado vs. táctil), no por el ancho de pantalla.
- El idioma de reconocimiento es español rioplatense (Argentina), fijo; no se ofrece selector de idioma en esta versión.
- Se usa el reconocimiento de voz que ofrece el navegador/dispositivo; puede requerir conexión a internet según el navegador. Sin conexión, el dictado puede no estar disponible y se avisa (FR-010), pero escribir a mano sigue funcionando normalmente, por lo que la paridad offline de la nota no se ve afectada.
- El audio lo procesa el servicio de reconocimiento del navegador (en algunos navegadores, fuera del dispositivo); la app no graba, guarda ni envía audio por su cuenta.
- La disponibilidad depende del navegador; en los navegadores sin soporte el botón se oculta (FR-007).
- No se agregan comandos de voz (por ejemplo "punto", "nueva línea") ni puntuación automática más allá de la que provea el reconocimiento.
