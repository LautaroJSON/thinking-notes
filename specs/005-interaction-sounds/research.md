# Investigación (Fase 0): Sonidos de interacción

Cada sección resuelve una incógnita del Contexto Técnico del plan.

## R1. Cómo generar los sonidos dentro de la app

- **Decisión**: síntesis en tiempo real con la **Web Audio API** nativa del navegador (`AudioContext`, osciladores, ruido filtrado y envolventes de ganancia). Cada sonido es una pequeña "receta" (función) que arma unos pocos nodos de audio y los descarta al terminar.
- **Razón**: cumple FR-017 (sin archivos ni bancos externos), pesa unos pocos KB de código, funciona sin conexión sin tocar el service worker (FR-015/FR-016) y permite variar tono y duración en cada tecla (FR-003). Está disponible en todos los navegadores objetivo de la PWA.
- **Alternativas descartadas**:
  - *Tone.js / Howler.js*: resuelven lo mismo con 30–150 KB extra; la síntesis que necesitamos son 5–8 recetas simples. Viola el principio V sin ventaja concreta.
  - *Pre-renderizar a buffers al iniciar*: agrega latencia de arranque y memoria; la síntesis por evento ya es barata (< 1 ms de CPU). Se puede reconsiderar si aparece algún problema de rendimiento.

## R2. Paleta sonora (recetas)

Todas comparten un volumen maestro bajo (~0.18) y ataques de 2–30 ms para evitar clics. Además, cada categoría tiene su propio volumen relativo: Escritura ×1, Selección ×0,5, Acciones ×0,65 (ajustado a pedido del usuario: selección y acciones más suaves; escritura sin cambios). La familia es "madera + papel + vidrio fino":

| Evento | Categoría | Receta | Duración |
|--------|-----------|--------|----------|
| Tecla (carácter, espacio) | Escritura | Ráfaga de ruido con filtro pasabanda ~2,5–4 kHz (centro aleatorio ±15 %), ganancia muy baja con leve variación aleatoria. "Lápiz sobre papel". | 18–30 ms |
| Borrar (Backspace/Supr) | Escritura | Igual, pero pasabanda más grave (~1,6 kHz). | ~25 ms |
| Enter | Escritura | Tecla + un "tock" grave muy suave. | ~50 ms |
| Selección (menú, interruptor, tema) | Selección | Seno ~740 Hz con caída de tono a ~560 Hz, ataque de 8 ms y caída exponencial. "Toque de madera" suave. | ~70 ms |
| Abrir / cerrar nota | Selección | Hoja de papel: al abrir, roce que sube con un crujido fino; al cerrar, roce que baja y un "flop" grave apagado. Sin tono. | ~130 ms |
| Cerrar menú | Selección | Igual, una cuarta más grave. | ~50 ms |
| Expandir / colapsar panel | Selección | Barrido de ruido suave ("papel que se desliza") ascendente / descendente + toque de madera que sube / baja. | ~160 ms |
| Crear nota | Acciones | Dos notas ascendentes suaves (ej. Mi5→La5), timbre de campanita amortiguada. | ~220 ms |
| Agregar idea | Acciones | Hoja que se apoya: roce de ruido descendente + "tock" grave de madera, sin notas musicales (la campanita sonaba a notificación). | ~90 ms |
| Borrar nota / idea | Acciones | Dos notas descendentes + barrido de ruido grave corto ("papel que se arruga" muy leve). | ~250 ms |
| Copiar / descargar | Acciones | Doble "tick" brillante y corto. | ~120 ms |
| Soltar nota al reordenar | Acciones | "Tock" grave de madera (~300 Hz). | ~90 ms |
| Pegar (imagen o texto) | Acciones | Barrido de ruido ascendente filtrado ("hoja que se apoya"). | ~150 ms |
| Dictado inicia / termina | Acciones | Glissando senoidal corto ascendente / descendente. | ~180 ms |

Ninguna supera 500 ms (FR-002). Los valores exactos se ajustan a oído durante la implementación; esta tabla fija el carácter y los límites.

## R3. Política de autoplay y ciclo de vida del AudioContext

- **Decisión**: el `AudioContext` se crea **perezosamente** en el primer gesto del usuario (`pointerdown` o `keydown` en `document`, con `{ capture: true, once: true }`) y se hace `resume()` si queda suspendido. Antes de eso, `play()` no hace nada.
- **Razón**: los navegadores bloquean audio sin gesto previo; así no hay advertencias en consola ni intentos de sonar al cargar (edge case "Primera interacción"). Crear el contexto tarde también evita costo en la carga inicial (FR-016).
- **Alternativas**: crear el contexto al montar la app (genera warnings y queda suspendido en iOS/Chrome).

## R4. No sonar con la pestaña oculta ni ante fallas

- **Decisión**: `play()` sale temprano si `document.visibilityState !== "visible"`, si no hay `AudioContext` disponible o si la síntesis lanza; todo va en `try/catch` sin propagar (FR-004).
- **Razón**: la app nunca debe romperse ni demorarse por audio.

## R5. Detección de escritura (global, sin tocar cada campo)

- **Decisión**: un único listener de `beforeinput` en `document` (montado una vez desde `App`), que mira `event.inputType`:
  - `insertText`, `insertReplacementText` → tecla.
  - `deleteContentBackward`, `deleteContentForward`, `deleteWord*` → borrar.
  - `insertLineBreak`, `insertParagraph` → Enter.
  - `insertFromPaste`, `insertFromDrop` → **no** suena como escritura (el pegado se maneja como Acción, ver R6).
  - `insertCompositionText` (IME) y cualquier otro → no suena.
  - Solo si el destino es un `<input type="text|search">` o `<textarea>` editable.
- **Razón**: `beforeinput` solo se dispara cuando el usuario realmente modifica texto, así que ignora Shift/Ctrl/flechas/atajos sin listas de teclas. El dictado actualiza el valor por código (estado de React), lo que **no** dispara `beforeinput`: no suena como escritura, tal como pide la spec. Cubre automáticamente el cuadro de ideas, el título, la búsqueda y la edición de ideas con imagen.
- **Alternativas**: `keydown` por componente (hay que repetirlo en 4+ campos y filtrar teclas a mano); `input` (no distingue pegado de tipeo en todos los navegadores y llega después del cambio).

## R6. Limitar ráfagas (tecla mantenida, tipeo rápido)

- **Decisión**: limitador por categoría Escritura: como máximo un sonido cada **35 ms**; además, un máximo de **6 voces** activas globales (si se excede, se descarta el sonido nuevo). La ganancia de cada tecla no se suma porque cada voz es independiente y muy corta.
- **Razón**: a 100 ppm (~8 teclas/s, 120 ms entre teclas) nunca se descarta una tecla real; la repetición automática (~30–50 ms) queda raleada (FR-003, SC-002).

## R7. Pegado

- **Decisión**: el sonido de "pegar" se dispara desde el `onPaste` del cuadro de ideas (que ya existe para imágenes) y desde el listener global para texto: `beforeinput` con `insertFromPaste` → sonido de Acción "pegar" una sola vez.
- **Razón**: un pegado es un único evento (edge case "Pegar texto").

## R8. Dispositivo táctil vs. computadora

- **Decisión**: `window.matchMedia("(pointer: coarse)").matches` en el momento de resolver el valor por defecto de Escritura. `coarse` → táctil → Escritura apagada por defecto.
- **Razón**: `pointer` refleja el **puntero principal**: una laptop con pantalla táctil reporta `fine` (se trata como computadora, como pide la spec); celulares y tablets reportan `coarse`.
- **Alternativas**: `ontouchstart in window` o `navigator.maxTouchPoints` (dan positivo en laptops táctiles).

## R9. Modo silencio del celular

- **Decisión**: donde exista `navigator.audioSession` (Safari iOS 17+), fijar `navigator.audioSession.type = "ambient"` al crear el contexto. Así el audio respeta el interruptor de silencio y no interrumpe la música del usuario.
- **Razón**: en iOS, Web Audio suena por defecto aunque el teléfono esté en silencio. En Android el volumen multimedia ya lo controla el usuario. Es "donde el sistema lo permita" (edge case).

## R10. Persistencia de la preferencia

- **Decisión**: `localStorage`, clave `"sounds"`, valor JSON con **solo lo que el usuario cambió explícitamente** (`{ enabled?: boolean, typing?: boolean, selection?: boolean, actions?: boolean }`). Los valores ausentes se resuelven con los defaults (incluido Escritura según dispositivo). Lectura tolerante: JSON inválido o tipos incorrectos → se ignoran campo por campo. Errores de `localStorage` se capturan (funciona en memoria).
- **Razón**: guardar solo overrides permite que "Escritura" mantenga el default por dispositivo hasta que el usuario lo toque, y que el día de mañana cambie un default sin pisar elecciones explícitas. Mismo patrón que `theme.ts` (FR-013, FR-014).
- **Sincronización entre pestañas**: evento `storage` para la clave `"sounds"`, igual que `useTheme` (deseable, barato).

## R11. Dónde se llaman los sonidos de Acciones sin sonar ante fallas

- **Decisión**: las acciones asíncronas que pueden fallar (crear y borrar nota en modo online) disparan el sonido **en la rama de éxito dentro de `notesContext`**, después de la respuesta de la API; en modo offline, al completar el cambio local. Las acciones locales/optimistas (agregar idea, borrar idea, soltar al reordenar, copiar con éxito, descargar) disparan desde el componente en el punto de éxito.
- **Razón**: `addNote`/`deleteNote` capturan sus errores internamente y no devuelven resultado; llamar al sonido en el componente sonaría aunque falle (FR-006). El reordenamiento es optimista (la nota ya se movió en pantalla): suena al soltar; si luego falla, el aviso de error sigue siendo visual (spec: "errores sin sonido").
- **Alternativas**: cambiar la firma de `addNote`/`deleteNote` para devolver `boolean` (toca más tipos y tests sin ventaja real).

## R12. Ubicación del control con el panel colapsado

- **Hallazgo**: hoy el selector de temas solo se renderiza en el pie del panel **expandido**; la cápsula colapsada muestra avatar y botón de expandir. `ThemeSelector` ya acepta `placement="right"` para abrir hacia la derecha.
- **Decisión (revisada en la implementación)**: el botón de sonido va solo en el pie del panel expandido, junto a la paleta, igual que el selector de temas. La cápsula colapsada tiene medidas fijas recién ajustadas (80×120 px en escritorio, píldora de 76×44 px en celular) y sumarle un botón obliga a rediseñarla; además el menú hacia la derecha se saldría de la pantalla en la píldora del celular. Llevar paleta y parlante a la cápsula queda como mejora posible. FR-007 se ajustó en consecuencia.
