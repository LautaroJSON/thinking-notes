# Especificación de Funcionalidad: Reordenar notas arrastrando en el panel lateral

**Feature Branch**: `feat/reorder-notes-drag`

**Created**: 2026-11-05

**Status**: Draft

**Input**: Descripción del usuario: "Como usuario quiero una nueva funcionalidad en donde pueda reorganizar el orden de las notas en el panel izquierdo manteniendo apretado, una especie de drag and drop."

## Escenarios de Usuario y Pruebas *(obligatorio)*

### Historia de Usuario 1 - Reordenar notas arrastrándolas (Prioridad: P1)

Como usuario, quiero mantener apretada una nota del panel izquierdo y arrastrarla hasta otra posición de la lista, para ordenar mis notas según lo que me resulta más importante o más usado.

**Por qué esta prioridad**: es el núcleo de la funcionalidad; sin poder mover una nota no hay valor que entregar.

**Prueba independiente**: con 3 o más notas, mantener apretada la segunda, arrastrarla al primer lugar y soltarla; la lista muestra la nota movida en primer lugar y el resto conserva su orden relativo.

**Escenarios de aceptación**:

1. **Dado** un panel con las notas A, B, C, **cuando** el usuario mantiene apretada C y la suelta antes de A, **entonces** la lista queda C, A, B.
2. **Dado** que el usuario está arrastrando una nota, **cuando** la mueve sobre la lista, **entonces** ve claramente qué nota está moviendo y en qué posición quedaría si la suelta.
3. **Dado** que el usuario está arrastrando una nota, **cuando** la suelta fuera de la lista o cancela el gesto (por ejemplo, con Escape en escritorio), **entonces** la lista vuelve al orden anterior sin cambios.
4. **Dado** que el usuario toca o hace clic brevemente sobre una nota (sin mantener apretado), **cuando** suelta, **entonces** la nota se abre o se cierra como hasta ahora, sin iniciar un arrastre.
5. **Dado** una lista con más notas de las que entran en pantalla, **cuando** el usuario arrastra una nota hacia el borde superior o inferior del panel, **entonces** la lista se desplaza para permitir llevarla a una posición no visible.

---

### Historia de Usuario 2 - El orden se conserva (Prioridad: P1)

Como usuario, quiero que el orden que elegí se mantenga al recargar la app o al volver a abrirla, tanto si uso la app sin cuenta como con sesión iniciada.

**Por qué esta prioridad**: un orden que se pierde al recargar no aporta valor real; además la constitución exige paridad offline/online.

**Prueba independiente**: reordenar notas, recargar la página y comprobar que el orden se mantiene; repetir en modo sin sesión y con sesión.

**Escenarios de aceptación**:

1. **Dado** que el usuario sin sesión reordenó sus notas, **cuando** recarga la página, **entonces** las notas aparecen en el orden elegido.
2. **Dado** que el usuario con sesión reordenó sus notas, **cuando** abre la app en otro dispositivo o navegador con la misma cuenta, **entonces** ve el mismo orden.
3. **Dado** que el usuario con sesión reordena y el guardado remoto falla, **cuando** ocurre el error, **entonces** se le informa de forma visible y la lista no queda en un estado inconsistente (se reintenta o se vuelve al último orden guardado).
4. **Dado** que el usuario soltó una nota en una nueva posición, **cuando** el guardado está en curso, **entonces** puede ver que el cambio está pendiente y luego que quedó guardado, igual que con el resto de los cambios.

---

### Historia de Usuario 3 - Reordenar desde el celular (Prioridad: P2)

Como usuario de la PWA en el celular, quiero reordenar las notas con el dedo manteniendo apretado, sin que el gesto se confunda con desplazar la lista.

**Por qué esta prioridad**: la app es una PWA pensada para celular; el pedido menciona explícitamente "mantener apretado", que es el gesto natural táctil. Se separa de la P1 porque en escritorio la funcionalidad ya aporta valor por sí sola.

**Prueba independiente**: en un celular, deslizar el dedo rápido sobre la lista la desplaza normalmente; mantener apretada una nota alrededor de medio segundo la "levanta" y permite moverla.

**Escenarios de aceptación**:

1. **Dado** el panel abierto en un celular, **cuando** el usuario desliza el dedo rápidamente sobre la lista, **entonces** la lista se desplaza y no se inicia ningún arrastre.
2. **Dado** el panel abierto en un celular, **cuando** el usuario mantiene apretada una nota sin moverla durante el tiempo de activación, **entonces** recibe una señal clara (visual, y vibración leve si el dispositivo la soporta) de que la nota quedó lista para moverse.
3. **Dado** que la nota quedó levantada, **cuando** el usuario mueve el dedo y lo suelta, **entonces** la nota queda en la nueva posición.
4. **Dado** que el usuario mantiene apretada una nota, **cuando** se activa el arrastre, **entonces** no aparece el menú contextual del navegador ni se selecciona texto.

---

### Casos borde

- **Una sola nota o lista vacía**: no hay nada que reordenar; mantener apretado no produce cambios ni errores.
- **Soltar en la misma posición**: no se considera un cambio y no se dispara ningún guardado.
- **Nota activa (abierta)**: se puede arrastrar; sigue abierta y resaltada después de moverla.
- **Notas nuevas**: aparecen en la misma posición que hoy (al final de la lista) y luego pueden reordenarse.
- **Borrar una nota**: el resto conserva su orden relativo.
- **Panel colapsado**: no se puede reordenar mientras el panel está colapsado.
- **Operación en curso**: mientras se cargan, crean o borran notas (estado de carga visible), el arrastre está deshabilitado para evitar estados inconsistentes.
- **Botón de borrar dentro de la nota**: mantener apretado sobre el botón de borrar no inicia un arrastre ni borra la nota.
- **Iniciar sesión con notas locales**: se aplica el orden de las notas de la cuenta; el orden local no se mezcla con el remoto.
- **Notas guardadas antes de esta funcionalidad**: se muestran en el mismo orden en que se veían antes, sin pasos extra para el usuario.
- **Reordenar en dos dispositivos a la vez**: prevalece el último orden guardado.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir mover una nota del panel izquierdo a cualquier otra posición de la lista mediante un gesto de mantener apretado y arrastrar, tanto con mouse como con pantalla táctil.
- **FR-002**: El sistema DEBE distinguir entre un toque/clic breve (abrir o cerrar la nota, comportamiento actual) y mantener apretado (iniciar el arrastre).
- **FR-003**: En pantallas táctiles, el sistema DEBE iniciar el arrastre solo tras mantener apretada la nota sin moverla durante un tiempo breve (aprox. 300–500 ms), para no interferir con el desplazamiento de la lista.
- **FR-004**: Durante el arrastre, el sistema DEBE mostrar qué nota se está moviendo y un indicador de la posición en la que quedará al soltarla.
- **FR-005**: El sistema DEBE permitir cancelar el arrastre (soltar fuera de la lista o tecla Escape en escritorio), dejando el orden sin cambios.
- **FR-006**: El sistema DEBE desplazar automáticamente la lista cuando la nota se arrastra cerca de los bordes del panel.
- **FR-007**: El sistema DEBE guardar el nuevo orden automáticamente al soltar la nota, sin pedir confirmación.
- **FR-008**: El orden DEBE persistir en modo sin sesión (en el dispositivo) y en modo con sesión (en la cuenta, visible desde cualquier dispositivo).
- **FR-009**: Si el guardado del orden falla, el sistema DEBE mostrar el error de forma visible y dejar la lista en un estado consistente con lo guardado o reintentar, sin perder notas ni su contenido.
- **FR-010**: El sistema DEBE indicar que el cambio de orden está pendiente y luego guardado, igual que con el resto de los cambios.
- **FR-011**: Las notas existentes antes de esta funcionalidad DEBEN conservar el orden en el que se veían.
- **FR-012**: Las notas nuevas DEBEN agregarse en la misma posición que hoy (al final de la lista).
- **FR-013**: El arrastre NO DEBE iniciarse sobre controles internos de la nota (por ejemplo, el botón de borrar) ni mientras haya una operación de carga en curso o el panel esté colapsado.
- **FR-014**: Al mantener apretado en dispositivos táctiles, el sistema NO DEBE mostrar el menú contextual del navegador ni seleccionar texto.
- **FR-015**: Las animaciones de reordenamiento DEBEN ser sutiles y no bloquear la interacción.

### Entidades clave

- **Nota**: la entidad existente (título y lista de thinkings). Suma un atributo de **posición** dentro de la lista del usuario, que determina el orden en el panel izquierdo.
- **Orden de notas**: la secuencia de notas del usuario. Es único por usuario/cuenta en modo con sesión y por dispositivo en modo sin sesión.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Un usuario puede mover una nota de la última a la primera posición de una lista de 10 notas en menos de 5 segundos.
- **SC-002**: El 100% de los reordenamientos se mantienen tras recargar la app, en ambos modos (sin y con sesión).
- **SC-003**: En celular, desplazar la lista con un deslizamiento rápido nunca inicia un arrastre accidental (0 de 20 intentos en la verificación manual).
- **SC-004**: Un toque o clic breve sobre una nota la abre en el 100% de los casos, igual que antes de la funcionalidad.
- **SC-005**: Ninguna nota se pierde, se duplica ni cambia de contenido como resultado de reordenar, incluso si el guardado remoto falla.
- **SC-006**: Con sesión iniciada, el orden elegido en un dispositivo se ve en otro dispositivo al abrir la app.

## Supuestos

- "Panel izquierdo" se refiere a la lista de notas del sidebar; no incluye reordenar los thinkings dentro de una nota (fuera de alcance).
- El orden es manual y único; no se agregan ordenamientos automáticos (por fecha, alfabético) en esta funcionalidad.
- Se mantiene la posición actual de las notas nuevas (al final de la lista).
- El gesto "mantener apretado" aplica a táctil; en escritorio basta con hacer clic y arrastrar (con un umbral de movimiento mínimo para no confundirlo con un clic).
- No se requiere accesibilidad completa por teclado para reordenar en esta versión; queda como mejora futura.
- En modo con sesión, guardar el orden requerirá que la capa remota pueda almacenar la posición de cada nota; los detalles se resuelven en el plan.
- Al iniciar sesión no se fusionan órdenes locales y remotos: se usa el orden de la cuenta.
- Ante conflictos entre dispositivos, prevalece el último orden guardado.
