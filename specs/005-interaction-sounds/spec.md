# Especificación de Funcionalidad: Sonidos de interacción

**Feature Branch**: `feat/interaction-sounds`

**Created**: 2026-11-06

**Status**: Draft

**Input**: Descripción del usuario: "me gustaria agregar sonidos a la web, al interactuar, seleccionar una nota, incluso escribir. con la opción de mutear estos sonido de manera particular. existe un banco de sonido gratis? o pudes generarlo tu? los sonidos tienen que ir acorde con el feeling y estilo de la web."

## Clarifications

### Session 2026-11-06

- Q: ¿Los sonidos se generan dentro de la app o se toman de un banco gratuito? → A: Se generan dentro de la app (sintetizados a medida, sin archivos de audio).
- Q: ¿Cómo están los sonidos la primera vez que alguien abre la app, sin haberlos configurado? → A: Todos encendidos (general, Escritura, Selección y Acciones).
- Q: En el celular, ¿el sonido de escritura de la app suena igual que en la computadora? → A: No por defecto: en dispositivos táctiles Escritura arranca apagada (el usuario puede encenderla); Selección y Acciones suenan igual.

## Carácter sonoro buscado

La app es minimalista, de degradados suaves y centrada en escribir. Los sonidos deben sentirse como **objetos de escritorio tranquilos**, no como un videojuego ni como notificaciones:

| Rasgo | Qué significa |
|-------|---------------|
| Cortos | Duran lo que un parpadeo; ninguno se "arrastra" sobre el siguiente. |
| Suaves | Volumen bajo, sin agudos punzantes ni golpes secos; ataques redondeados. |
| Cálidos y orgánicos | Remiten a madera, papel, lápiz y vidrio fino; nada metálico ni electrónico estridente. |
| Coherentes | Todos parecen de la misma "familia", como si salieran del mismo escritorio. |
| Con jerarquía | Escribir es casi imperceptible; seleccionar es un toque breve; las acciones (crear, borrar) tienen un poco más de presencia. |
| No repetitivos | El sonido de escritura varía levemente entre teclas para no sonar a metrónomo. |

## Origen de los sonidos: opciones evaluadas

El pedido pregunta si existe un banco de sonidos gratis o si se pueden generar. Ambas cosas son posibles:

| Opción | Descripción | A favor | En contra |
|--------|-------------|---------|-----------|
| **A (recomendada)** | **Generarlos dentro de la app** (sonidos sintetizados a medida, sin archivos de audio). | Se diseñan exactamente con el carácter de arriba; pesan prácticamente cero; funcionan sin conexión desde el primer uso; sin licencias ni atribuciones; se pueden ajustar fino (tono, duración, variación por tecla). | Sonidos de "papel" o "madera" muy realistas son más difíciles de lograr que con grabaciones; requiere una ronda de ajuste a oído. |
| B | **Banco gratuito con licencia libre** (por ejemplo, el paquete *UI Audio* / *Interface Sounds* de Kenney, de dominio público CC0, o sonidos CC0 de Freesound). | Sonidos grabados, realistas y listos para usar; CC0 no exige atribución. | Hay que elegir y recortar entre muchos sonidos que no fueron pensados para esta app; suman peso a la descarga y deben quedar disponibles sin conexión; más difícil que todos suenen "de la misma familia". |
| C | Mixto: generar los de escritura y selección, y usar grabaciones CC0 para las acciones destacadas. | Lo mejor de ambos donde más importa. | Dos fuentes que mantener; riesgo de incoherencia entre sonidos. |

Elección: **Opción A — generarlos dentro de la app**, confirmada por el usuario el 2026-11-06. No se usan archivos de audio ni bancos externos.

## Ubicación del control de sonido

Se propone un **botón con ícono de parlante en el pie del panel lateral, junto al botón de temas (paleta)**, siguiendo el mismo patrón: al presionarlo se despliega hacia arriba un pequeño menú con un interruptor general ("Sonidos") y un interruptor por cada categoría. El ícono muestra el parlante tachado cuando todo está silenciado. Es el lugar donde ya viven las preferencias de la app, está disponible con y sin sesión, y no agrega nada al área de escritura.

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Escuchar respuesta sonora al usar la app (Prioridad: P1)

Como usuario, quiero que la app responda con sonidos suaves cuando selecciono una nota, cuando hago acciones (crear, agregar una idea, borrar, copiar) y cuando escribo, para que la experiencia se sienta más viva y "táctil" sin distraerme.

**Por qué esta prioridad**: es el núcleo de la funcionalidad; sin sonidos no hay nada que silenciar ni configurar.

**Prueba independiente**: con los sonidos activados, seleccionar una nota, crear una nota, agregar una idea, borrar una idea y escribir un párrafo; comprobar que cada acción suena una vez, que los sonidos son coherentes entre sí y que escribir rápido no genera ruido molesto ni retrasa el texto.

**Escenarios de aceptación**:

1. **Dado** los sonidos activados, **cuando** el usuario selecciona una nota en la lista, **entonces** suena un toque breve de selección.
2. **Dado** los sonidos activados, **cuando** el usuario crea una nota, agrega una idea, borra una nota o una idea, copia contenido, suelta una nota al reordenarla, pega una imagen o inicia/detiene el dictado, **entonces** suena el sonido correspondiente a esa acción, una sola vez.
3. **Dado** los sonidos activados, **cuando** el usuario escribe en un campo de texto, **entonces** cada tecla que produce texto (letras, números, espacios, borrar, Enter) emite un sonido de escritura muy sutil, con leves variaciones entre teclas.
4. **Dado** que el usuario escribe muy rápido o mantiene una tecla apretada, **cuando** se producen muchas pulsaciones seguidas, **entonces** los sonidos no se amontonan ni suben de volumen, y el texto aparece sin ningún retraso.
5. **Dado** los sonidos activados, **cuando** el usuario abre o cierra un menú (descarga, temas, sonido) o cambia de tema, **entonces** suena el toque de selección.

---

### Historia de Usuario 2 - Silenciar los sonidos por categoría o todos juntos (Prioridad: P1)

Como usuario, quiero poder silenciar todos los sonidos o solo algunos (por ejemplo, el de escritura) de manera particular, para quedarme únicamente con los que me gustan.

**Por qué esta prioridad**: el pedido lo exige explícitamente y un sonido que no se puede apagar es motivo para abandonar la app; tiene el mismo peso que los sonidos en sí.

**Prueba independiente**: abrir el control de sonido, apagar solo "Escritura", comprobar que escribir no suena pero seleccionar y las acciones sí; luego apagar el interruptor general y comprobar que nada suena.

**Escenarios de aceptación**:

1. **Dado** los sonidos activados, **cuando** el usuario presiona el botón de sonido, **entonces** se despliega un menú con un interruptor general y un interruptor por categoría (Escritura, Selección, Acciones), cada uno mostrando su estado actual.
2. **Dado** el menú abierto, **cuando** el usuario apaga una categoría, **entonces** los sonidos de esa categoría dejan de sonar de inmediato y los de las demás siguen sonando.
3. **Dado** el menú abierto, **cuando** el usuario apaga el interruptor general, **entonces** no suena ningún sonido, el ícono del botón se muestra silenciado y las preferencias por categoría se conservan para cuando vuelva a encenderlo.
4. **Dado** el menú abierto, **cuando** el usuario enciende una categoría, **entonces** suena una muestra breve de esa categoría para que sepa cómo suena.
5. **Dado** el menú abierto, **cuando** el usuario hace clic fuera, presiona Escape o vuelve a presionar el botón, **entonces** el menú se cierra.
6. **Dado** el control de sonido, **cuando** el usuario lo usa solo con teclado o con lector de pantalla, **entonces** puede abrirlo, cambiar cada interruptor y cerrarlo, y cada interruptor anuncia su nombre y estado.

---

### Historia de Usuario 3 - La preferencia de sonido se recuerda (Prioridad: P2)

Como usuario, quiero que la app recuerde qué sonidos silencié la próxima vez que la abra en este navegador, con o sin sesión, para no tener que configurarlo cada vez.

**Por qué esta prioridad**: sin persistencia el silencio se pierde al recargar y obliga a repetirlo; la constitución exige paridad offline/online.

**Prueba independiente**: apagar "Escritura", recargar la página y comprobar que sigue apagada; repetir sin sesión y con sesión.

**Escenarios de aceptación**:

1. **Dado** que el usuario (sin sesión o con sesión) silenció categorías o todo, **cuando** recarga o vuelve a abrir la app en el mismo navegador, **entonces** se mantiene exactamente la misma configuración.
2. **Dado** que el usuario configuró los sonidos, **cuando** inicia o cierra sesión, **entonces** la configuración no cambia.
3. **Dado** un usuario que nunca configuró los sonidos, **cuando** abre la app, **entonces** el interruptor general y las tres categorías (Escritura, Selección y Acciones) están encendidos.
4. **Dado** un usuario que nunca configuró los sonidos y usa un dispositivo táctil (celular o tablet), **cuando** abre la app, **entonces** el interruptor general, Selección y Acciones están encendidos y Escritura está apagada; si la enciende, la app lo recuerda en ese dispositivo.

### Edge Cases

- **Primera interacción**: los navegadores no permiten sonido hasta que el usuario interactúa con la página; la app no debe intentar sonar al cargar ni mostrar errores por eso. El primer sonido puede ser el de la primera interacción real.
- **Guardado automático**: el guardado ocurre solo y con frecuencia; NO debe sonar al guardar, para no generar ruido constante.
- **Carga y sincronización**: las cargas, sincronizaciones y cambios que no inició el usuario (por ejemplo, datos que llegan del servidor) no suenan.
- **Dictado por voz**: el texto que entra por dictado no dispara sonidos de escritura; solo suenan el inicio y el fin del dictado.
- **Pegar texto**: pegar un bloque de texto suena como una única acción, no como una tecla por carácter.
- **Teclas que no escriben** (Shift, Ctrl, flechas, atajos como Ctrl+C): no emiten sonido de escritura.
- **Mantener una tecla apretada**: la repetición automática no produce una ráfaga molesta; se limita la frecuencia de sonidos.
- **Acciones que fallan**: si una acción falla (por ejemplo, no se pudo borrar), no debe sonar el sonido de éxito de esa acción.
- **Celular en modo silencio**: la app respeta el silencio del dispositivo donde el sistema lo permita.
- **Pestaña en segundo plano**: no suena nada mientras la pestaña no está visible.
- **El dispositivo no puede reproducir sonido** o la reproducción falla: la app sigue funcionando igual, sin errores visibles ni demoras.
- **Almacenamiento local no disponible**: los interruptores funcionan durante la sesión actual; solo no se recuerdan al recargar.
- **Valor guardado inválido**: se usan los valores por defecto sin mostrar errores.
- **Dispositivo táctil con teclado propio**: el teclado del sistema del celular ya da su propio clic o vibración; por eso Escritura arranca apagada en táctiles, para no duplicar la respuesta. Una computadora con pantalla táctil pero con mouse/teclado como entrada principal se trata como computadora.
- **Varias pestañas abiertas**: un cambio en una pestaña se aplica en las demás al recargarlas (sincronizarlas en vivo es deseable pero no obligatorio).

## Requisitos *(obligatorio)*

### Requisitos Funcionales

- **FR-001**: La app DEBE reproducir sonidos agrupados en tres categorías:
  - **Escritura**: cada tecla que produce o borra texto en los campos de escritura (cuadro de ideas, título de nota, búsqueda).
  - **Selección**: seleccionar una nota, abrir/cerrar menús, colapsar/expandir el panel lateral, cambiar de tema, encender/apagar interruptores.
  - **Acciones**: crear nota, agregar idea, borrar nota o idea, copiar, soltar una nota al reordenar, pegar imagen o texto, iniciar y detener dictado, descargar.
- **FR-002**: Todos los sonidos DEBEN respetar el carácter sonoro definido en "Carácter sonoro buscado": cortos (ninguno supera medio segundo; los de escritura y selección, menos de un décimo de segundo), suaves, cálidos y de la misma familia.
- **FR-003**: Los sonidos de Escritura DEBEN ser los más sutiles, variar levemente entre pulsaciones y limitarse en frecuencia para que tipear rápido o mantener una tecla no genere ráfagas ni acumulación de volumen.
- **FR-004**: Reproducir un sonido NUNCA DEBE retrasar ni bloquear la escritura, la selección ni ninguna acción; si un sonido no puede reproducirse, la app DEBE seguir funcionando sin errores visibles.
- **FR-005**: La app NO DEBE reproducir sonidos por eventos que el usuario no inició (carga inicial, guardado automático, sincronización, texto ingresado por dictado) ni mientras la pestaña está en segundo plano.
- **FR-006**: Una acción que falla NO DEBE reproducir el sonido de éxito de esa acción.
- **FR-007**: La app DEBE mostrar un botón de sonido con ícono de parlante en el pie del panel lateral, junto al botón de temas, con o sin sesión. Igual que el selector de temas, se muestra con el panel expandido; la cápsula del panel colapsado no cambia (decisión de implementación, 2026-11-06).
- **FR-008**: El botón DEBE desplegar un menú con un interruptor general y un interruptor independiente por categoría (Escritura, Selección, Acciones), cada uno indicando su estado.
- **FR-009**: Apagar el interruptor general DEBE silenciar todos los sonidos sin perder la configuración por categoría; al volver a encenderlo, se restaura la configuración previa.
- **FR-010**: El ícono del botón DEBE indicar visualmente cuando todos los sonidos están silenciados.
- **FR-011**: Los cambios en los interruptores DEBEN aplicarse de inmediato, sin recargar.
- **FR-012**: El menú DEBE cerrarse al hacer clic/tocar fuera, al presionar Escape o al volver a activar el botón, y DEBE ser usable con teclado y lector de pantalla (nombres y estados anunciados en español).
- **FR-013**: La configuración de sonido DEBE guardarse en el almacenamiento local del navegador, igual con y sin sesión, y NO DEBE guardarse en la base de datos remota.
- **FR-014**: Si no hay configuración guardada o es inválida, la app DEBE usar el estado por defecto: interruptor general, Selección y Acciones encendidos; Escritura encendida en dispositivos cuyo método principal de entrada es el mouse/teclado físico y apagada en dispositivos táctiles (celular, tablet). En todos los casos el usuario puede cambiar Escritura desde el menú.
- **FR-015**: Los sonidos DEBEN estar disponibles sin conexión desde el primer uso, sin depender del login ni de la red (paridad offline/online).
- **FR-016**: Agregar sonidos NO DEBE aumentar de forma perceptible el tiempo de carga de la app ni romper la instalación o actualización de la PWA.
- **FR-017**: Los sonidos DEBEN generarse dentro de la app, sin depender de archivos de audio descargados ni de bancos de sonido externos.

### Key Entities

- **Categoría de sonido**: grupo de sonidos que se silencian juntos. Atributos: identificador estable, nombre visible en español (Escritura, Selección, Acciones) y los eventos que la disparan.
- **Sonido**: la respuesta audible a un evento. Atributos: categoría a la que pertenece, evento que lo dispara y carácter (duración, intensidad relativa).
- **Preferencia de sonido**: lo que eligió quien usa ese navegador. Atributos: interruptor general y estado de cada categoría. Se guarda localmente, es independiente de la cuenta y de la sesión.

## Criterios de Éxito *(obligatorio)*

### Resultados Medibles

- **SC-001**: Un usuario puede silenciar una categoría específica o todos los sonidos en 2 interacciones y menos de 5 segundos.
- **SC-002**: Al escribir a 100 palabras por minuto con el sonido de escritura activo, el texto no muestra ningún retraso perceptible y el sonido no satura ni se acumula.
- **SC-003**: El 100 % de las recargas y reaperturas en el mismo navegador conservan la configuración de sonido, en modo sin sesión y con sesión.
- **SC-004**: Con una categoría silenciada, el 0 % de los eventos de esa categoría produce sonido; con el interruptor general apagado, ningún evento produce sonido.
- **SC-005**: El tiempo de carga de la app no aumenta de forma perceptible respecto de la versión anterior.
- **SC-006**: En la escucha manual, todos los sonidos se perciben como una misma familia, ninguno resulta estridente a volumen normal del dispositivo, y el de escritura pasa casi desapercibido tras unos minutos de uso.
- **SC-007**: Con la app sin conexión, todos los sonidos funcionan igual que con conexión.

## Supuestos

- La ubicación del control (botón de parlante junto a la paleta de temas en el pie del panel lateral) sigue el patrón ya validado para el selector de temas.
- Esta versión no incluye control de volumen: solo encendido/apagado por categoría y general. Un control de volumen o sonidos distintos según el tema quedan fuera de alcance.
- Los sonidos son los mismos en los tres temas visuales.
- La preferencia se guarda por navegador/dispositivo y no se sincroniza entre dispositivos aunque haya sesión, igual que el tema.
- No se agregan sonidos a errores ni a notificaciones: la respuesta de error sigue siendo visual.
- Los textos de la interfaz (nombres de categorías, etiquetas accesibles) están en español.
- Verificación manual: recorrer cada evento de las tres categorías en escritorio y celular, con y sin sesión y sin conexión, silenciando cada categoría por separado y todas juntas. La lógica de preferencias (guardar, leer, valores inválidos, interruptor general vs. categorías) y la decisión de si un evento debe sonar se cubren con tests automatizados.
