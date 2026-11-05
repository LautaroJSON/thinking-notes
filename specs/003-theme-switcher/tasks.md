---
description: "Lista de tareas para el selector de temas visuales"
---

# Tareas: Selector de temas visuales

**Input**: Documentos de diseño en `specs/003-theme-switcher/`

**Prerrequisitos**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: se incluyen porque la constitución (principio III) exige tests de Vitest para la lógica nueva (utilidades y hooks). La UI se verifica manualmente según [quickstart.md](./quickstart.md).

**Organización**: tareas agrupadas por historia de usuario para implementarlas y probarlas de forma independiente.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia a la que pertenece (US1, US2, US3)

## Convenciones de rutas

- Solo frontend, rutas desde la raíz del repo `thinking-notes`. No hay cambios en el backend.
- Tabla de tokens y valores de cada tema: [data-model.md](./data-model.md) › "Tokens de color".

---

## Fase 1: Setup

**Propósito**: rama de trabajo.

- [X] T001 Crear la rama `feat/theme-switcher` desde `main` actualizado (sin dependencias nuevas que instalar)

---

## Fase 2: Fundacional (bloquea todas las historias)

**Propósito**: lógica pura del tema y tokenización de todos los colores, con el Clásico idéntico al actual.

**⚠️ CRÍTICO**: ninguna historia empieza hasta terminar esta fase.

### Tests de la lógica base

- [X] T002 [P] Escribir `src/components/utils/theme.test.ts` (patrón de `drafts.test.ts`, `localStorage.clear()` y limpiar `data-theme` y la meta en `afterEach`) cubriendo: `isThemeId` acepta `classic`/`dark`/`sunset` y rechaza `"rosa"`, `""`, `null`, `42`; `loadTheme` devuelve `classic` sin clave, con valor inválido y cuando `localStorage.getItem` lanza (`vi.spyOn(Storage.prototype, "getItem")`); `loadTheme` devuelve `dark` si está guardado; `saveTheme("sunset")` escribe la clave `theme`; `saveTheme("classic")` borra la clave; `saveTheme` no lanza si `setItem` lanza (y llama a `console.error`); `applyTheme("dark")` pone `document.documentElement.dataset.theme === "dark"` y actualiza `meta[name="theme-color"]` con el `metaColor` del tema (crear la meta en el test); `applyTheme("classic")` quita el atributo; `getAppliedTheme` lee y valida el atributo. Los tests deben fallar antes de T003

### Implementación de la lógica base

- [X] T003 Crear `src/components/utils/theme.ts` según [contracts/storage-theme.md](./contracts/storage-theme.md) y [data-model.md](./data-model.md): `THEME_STORAGE_KEY = "theme"`, `THEME_IDS = ["classic", "dark", "sunset"] as const`, `type ThemeId`, `interface ThemeOption { id; label; metaColor }`, `THEMES: readonly ThemeOption[]` (Clásico `#ffffff`, Oscuro `#0f1320`, Atardecer `#fff7ed`), `isThemeId(value: unknown)`, `loadTheme()`, `saveTheme(id)`, `applyTheme(id)` (quita `data-theme` para `classic`; actualiza la meta si existe) y `getAppliedTheme()`. Todo con `try/catch` donde se toque `localStorage`, sin `any`, comentarios en español. Hacer pasar T002

### Tokens y Clásico idéntico al actual

- [X] T004 Crear `src/themes.css` con todos los tokens de la tabla de [data-model.md](./data-model.md) definidos en `:root` con los **valores del Clásico** (los actuales), incluido `--bg-gradient` como el `linear-gradient(to right top, …)` actual. Importarlo al principio de `src/index.css` (`@import "./themes.css";`) y cambiar en `src/index.css` el fondo del `body` a `background-image: var(--bg-gradient)` y el thumb del scrollbar a `var(--scrollbar)`. Mantener `--primary-color` con el mismo nombre (lo usan muchos archivos)
- [X] T005 [P] Tokenizar `src/components/sidebar/styles.css`: `rgb(255,255,255)` → `var(--surface)`, sombras del panel/cápsula → `var(--shadow-panel)`, `.circular-button` agrega `color: var(--on-primary)`, `rgba(0,0,0,.05)` → `var(--surface-hover)`, `#333` → `var(--text)`, `#8b8b8bd3`/`#8b8b8b` → `var(--text-subtle)`, `#d64545` → `var(--danger)`, `rgba(66,66,66,.219)` → `color-mix(in srgb, var(--text) 22%, transparent)`. Mantener la sombra del botón circular tal cual (neutra)
- [X] T006 [P] Tokenizar `src/components/notes/noteItem/styles.css`: fondos blancos/`white` → `var(--surface)` o `var(--on-primary)` según sea fondo o texto sobre el acento, `#d1d1d1` → `var(--border-strong)`, `#555555` → `var(--text-muted)`, `#1f1f1f` → `var(--text-strong)`, sombras `rgba(63,68,138,…)` → `var(--shadow-card)` (la de arrastre puede ser `var(--shadow-panel)`)
- [X] T007 [P] Tokenizar `src/components/notes/noteContent/styles.css` (~700 líneas) aplicando la columna "Uso" de la tabla de tokens: `white`/`#ffffff` de fondo → `var(--surface)`, `#ffffff` como texto sobre el acento → `var(--on-primary)`, `#fafbfc`/`#f8fafc`/`#f1f5f9` → `var(--surface-alt)`, `#e2e8f0`/`#eef2f6` → `var(--border)`, `#d1d1d1` → `var(--border-strong)`, `#1e293b` → `var(--text-strong)`, `#334155` → `var(--text)`, `#64748b`/`#666666`/`#777777` → `var(--text-muted)`, `#94a3b8`/`#cbd5e1` → `var(--text-subtle)`, `#eef1ff` → `var(--primary-soft)`, `#16a34a`/`#4caf50` → `var(--success)`, `#ecfdf5` → `var(--success-soft)`, `#ef4444`/`#dc2626` → `var(--danger)`, `#fef2f2` → `var(--danger-soft)`, `#facc15` → `var(--highlight)`, `#1a1a1a` → `var(--on-highlight)`, `rgba(120,144,255,X)` y `rgba(59,130,246,.1)` → `color-mix(in srgb, var(--primary-color) X%, transparent)`, sombra principal `rgba(31,38,135,.37)` → `var(--shadow-panel)`, `rgba(0,0,0,.7)` del overlay animado → `var(--overlay)`, `rgba(255,255,255,.25)` → `color-mix(in srgb, var(--surface) 25%, transparent)`, `rgba(51,65,85,.22)` → `color-mix(in srgb, var(--text) 22%, transparent)`. Las sombras chicas neutras (`rgba(0,0,0,.05)`, `rgba(15,23,42,…)`) pueden quedar fijas
- [X] T008 [P] Tokenizar `src/components/profile/styles.css`: overlay → `var(--overlay)`, `white` → `var(--surface)`, `#333` → `var(--text)`, `#666` → `var(--text-muted)`, botón de logout `#dc3545`/`#c82333` → `var(--danger)` y `color-mix(in srgb, var(--danger) 85%, black)` en hover, texto `white` → `#ffffff` fijo (sobre rojo en los tres temas)
- [X] T009 [P] Tokenizar `src/components/appVersion/styles.css` (`var(--negro-2)` → `var(--text-strong)`) y revisar `src/App.css` (sin colores hoy; no tocar si sigue así)
- [X] T010 En `src/components/sidebar/index.tsx`, quitar `color="white"` de `CircleArrowRight`, `Trash2`, `Plus` y `CircleArrowLeft` para que hereden `color: var(--on-primary)` del `.circular-button` (depende de T005)
- [X] T011 Buscar con `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|\bwhite\b|--negro|--gris-oscuro" src --include="*.css"` los colores que queden fuera de `src/themes.css` y decidir cada uno (token o neutro fijo justificado); reemplazar los usos restantes de `--negro`, `--negro-2` y `--gris-oscuro` y eliminarlas de `src/index.css`

**Checkpoint**: `npm run dev` sin elegir tema → la app se ve **idéntica a `main`** (comparar capturas de panel, notas, cuadro de texto, menús, modal de perfil, estados). `npm test` en verde.

---

## Fase 3: Historia 1 – Cambiar el tema de la app (P1) 🎯 MVP

**Objetivo**: elegir Clásico, Oscuro o Atardecer desde el botón de paleta al pie del panel y ver toda la interfaz cambiar al instante.

**Prueba independiente**: abrir el selector, elegir Oscuro y luego Atardecer; toda la interfaz cambia sin recargar y sin perder el texto en edición (quickstart §1). En esta fase el tema todavía no se recuerda al recargar.

### Tests de la Historia 1

- [X] T012 [P] [US1] Escribir `src/hooks/useTheme.test.ts` con `renderHook` de Testing Library: devuelve `theme === "classic"` sin atributo; devuelve el catálogo `themes` en orden Clásico, Oscuro, Atardecer; `setTheme("dark")` actualiza `theme` y pone `data-theme="dark"` en `<html>`; dos hooks montados a la vez ven el mismo cambio. Limpiar `data-theme` en `afterEach`

### Implementación de la Historia 1

- [X] T013 [P] [US1] Agregar en `src/themes.css` el bloque `:root[data-theme="dark"]` con todos los valores de la columna Oscuro de [data-model.md](./data-model.md), y `color-scheme: dark` para que los controles nativos (scrollbars, inputs) acompañen
- [X] T014 [US1] Agregar en `src/themes.css` el bloque `:root[data-theme="sunset"]` con los valores de la columna Atardecer (después de T013, mismo archivo)
- [X] T015 [US1] Agregar en `src/themes.css` las muestras del menú: reglas `[data-theme-preview="classic" | "dark" | "sunset"]` que pintan un círculo con el degradado de fondo y un borde con el acento de cada tema (valores literales del tema correspondiente, ya que la muestra se ve dentro de otro tema). Después de T014
- [X] T016 [US1] Crear `src/hooks/useTheme.ts` según [contracts/theme-selector-ui.md](./contracts/theme-selector-ui.md): store a nivel de módulo con `Set` de listeners, `useSyncExternalStore(subscribe, getAppliedTheme)`, `setTheme(id)` que llama a `applyTheme(id)` y notifica a los listeners; devuelve `{ theme, themes: THEMES, setTheme }`. En esta fase **no** guarda en `localStorage`. Hacer pasar T012
- [X] T017 [P] [US1] Crear `src/components/themeSelector/styles.css`: contenedor `position: relative`; botón reutiliza `.circular-button` con área táctil ≥ 40 px (pseudo-elemento o padding invisible); menú `.theme-menu` con `var(--surface)`, `var(--border)`, `var(--shadow-panel)`, radio 12 px, `z-index` por encima de la lista de notas, abierto hacia arriba (`bottom: calc(100% + 8px); left: 0`); ítems con muestra de 20 px, nombre en `var(--text)`, hover `var(--surface-hover)`, foco visible con `var(--primary-color)`, `Check` en `var(--primary-color)`; animación de aparición sutil (~120 ms) desactivada con `prefers-reduced-motion`
- [X] T018 [US1] Crear `src/components/themeSelector/index.tsx` siguiendo el patrón de `src/components/notes/noteContent/components/downloadMenu.tsx`: botón con ícono `Palette` (lucide-react), `aria-label`/`title` "Cambiar tema", `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` con `useId`; menú `role="menu"` `aria-label="Temas"` con un `button role="menuitemradio"` por tema (`aria-checked`, `<span data-theme-preview={id}>`, nombre, `Check` si activo). Cierre con clic/toque afuera (`pointerdown`), Escape y re-clic. Teclado: al abrir enfoca el ítem activo; ↑/↓ circulares, Home/End, Enter/Espacio eligen; Tab cierra; al cerrar o elegir, el foco vuelve al botón. Al elegir: `setTheme(id)` y cerrar. Prop opcional `placement?: "top" | "right"` (por defecto `"top"`) que agrega una clase modificadora al menú
- [X] T019 [US1] Montar `<ThemeSelector />` en el panel expandido de `src/components/sidebar/index.tsx`: nuevo `<div className="sidebar-footer">` después de `.sidebar-notes-list`, solo cuando `!collapsed`; en `src/components/sidebar/styles.css` agregar `.sidebar-footer` (`flex-shrink: 0`, padding alineado con la lista, sin borde superior duro, `position: relative` para que el menú se superponga a la lista). Verificar que la lista sigue scrolleando y que el pie no tapa la última nota
- [X] T020 [US1] Transición suave (FR-014): en `applyTheme` de `src/components/utils/theme.ts` agregar la clase `theme-transition` a `<html>` y quitarla a los ~250 ms (solo si no es la carga inicial, p. ej. parámetro `{ animate: true }` que pasa `useTheme.setTheme`); en `src/themes.css` definir `.theme-transition, .theme-transition *, .theme-transition *::before, .theme-transition *::after { transition: background-color .2s ease, color .2s ease, border-color .2s ease, box-shadow .2s ease !important; }` dentro de `@media (prefers-reduced-motion: no-preference)`. Agregar a `theme.test.ts` un caso con `vi.useFakeTimers()` que verifique que la clase se pone y se quita
- [ ] T021 [US1] Verificación manual de quickstart §1 (pasos 1 a 7) en escritorio, sin sesión y con sesión, revisando cada superficie en Oscuro y Atardecer; ajustar tokens en `src/themes.css` (y la tabla de [data-model.md](./data-model.md)) si algo queda ilegible o con colores del Clásico

**Checkpoint**: la Historia 1 funciona sola: se puede cambiar de tema en vivo; al recargar vuelve al Clásico.

---

## Fase 4: Historia 2 – El tema elegido se recuerda (P1)

**Objetivo**: el tema elegido se guarda en el navegador (con y sin sesión) y se aplica al cargar sin destello.

**Prueba independiente**: elegir Atardecer, recargar → abre en Atardecer sin destello; repetir con sesión, al iniciar y al cerrar sesión (quickstart §2).

### Tests de la Historia 2

- [X] T022 [P] [US2] Agregar a `src/components/utils/theme.test.ts` un test que lea `index.html` de la raíz con `fs.readFileSync(path.resolve(__dirname, "../../../index.html"), "utf8")` y verifique que el script inline contiene `"theme"` (= `THEME_STORAGE_KEY`), cada id no clásico de `THEME_IDS` y el `metaColor` de cada tema no clásico, y que existe `<meta name="theme-color"`
- [X] T023 [P] [US2] Agregar a `src/hooks/useTheme.test.ts`: `setTheme("sunset")` guarda `"sunset"` en `localStorage["theme"]`; `setTheme("classic")` borra la clave; un `StorageEvent("storage", { key: "theme", newValue: "dark" })` despachado en `window` actualiza `theme` a `dark` y aplica `data-theme`; un evento con valor inválido aplica `classic`; un evento de otra clave se ignora

### Implementación de la Historia 2

- [X] T024 [US2] En `src/hooks/useTheme.ts`: `setTheme` llama también a `saveTheme(id)`; `subscribe` agrega un listener de `window` `"storage"` que, si `event.key === THEME_STORAGE_KEY`, valida `event.newValue` con `isThemeId` (inválido o `null` → `classic`), llama a `applyTheme` y notifica; quitar el listener al desuscribirse. Hacer pasar T023
- [X] T025 [US2] En `index.html`: agregar `<meta name="theme-color" content="#ffffff" />` y, **antes** de los `<link>` de fuentes y del script del bundle, un `<script>` inline (no módulo) que haga `try { var t = localStorage.getItem("theme"); var c = { dark: "#0f1320", sunset: "#fff7ed" }; if (t && c[t]) { document.documentElement.dataset.theme = t; document.querySelector('meta[name="theme-color"]').setAttribute("content", c[t]); } } catch (e) {}` con un comentario en español que diga que debe coincidir con `src/components/utils/theme.ts`. Cambiar `lang="en"` por `lang="es"`. Hacer pasar T022
- [ ] T026 [US2] Verificación manual de quickstart §2 (pasos 1 a 6): sin destello con "Slow 4G" y caché deshabilitada, con/sin sesión, al iniciar y cerrar sesión, valor inválido, almacenamiento bloqueado y dos pestañas

**Checkpoint**: Historias 1 y 2 completas → **primer entregable**.

---

## Fase 5: Historia 3 – Elegir el tema desde el celular (P2)

**Objetivo**: el selector es accesible y cabe en pantalla en celular, con el panel expandido y colapsado; la barra del navegador acompaña el tema.

**Prueba independiente**: a 360 px de ancho, abrir el selector con el panel expandido y colapsado; el menú se ve completo y sin scroll horizontal (quickstart §3).

### Implementación de la Historia 3

- [X] T027 [US3] En `src/components/sidebar/index.tsx`, dentro de `.sidebar-collapsed-content`, agregar `<ThemeSelector placement="right" />` debajo del botón de expandir. En `src/components/sidebar/styles.css`: `.sidebar-container.collapsed` pasa a `height: auto` (con `min-height: 76px`) y `.sidebar-collapsed-content` a `flex-direction: column` con `gap` de 8 px, para apilar avatar, expandir y paleta; revisar el `@media (max-width: 768px)` del colapsado (60 px de ancho) para que los tres entren centrados
- [X] T028 [P] [US3] En `src/components/themeSelector/styles.css`: modificador `placement="right"` (`left: calc(100% + 8px); bottom: 0`), y en `@media (max-width: 768px)` `max-width: calc(100vw - 32px)`, ítems de al menos 44 px de alto y sin desborde horizontal
- [ ] T029 [US3] Verificación manual de quickstart §3 (pasos 1 a 4) en celular o DevTools a 360 px: panel expandido y colapsado, color de la barra en Chrome Android/PWA instalada, y que el service worker se siga instalando y actualizando sin errores

**Checkpoint**: las tres historias funcionan de forma independiente.

---

## Fase 6: Pulido y transversales

- [X] T030 Verificación de contraste (quickstart §4) en los tres temas con DevTools: `--text` y `--text-muted` sobre `--surface` ≥ 4.5:1, íconos sobre `--primary-color` ≥ 3:1, estados distinguibles; ajustar `src/themes.css` y actualizar la tabla de [data-model.md](./data-model.md) si cambian valores
- [X] T031 [P] Revisar con `prefers-reduced-motion: reduce` emulado que el cambio de tema y la apertura del menú no animan
- [X] T032 Correr `npm test`, `npm run build` y `npm run lint`; los archivos tocados no deben sumar errores de lint respecto de `main`
- [X] T033 [P] Subir la versión a `1.8.0` en `package.json` (y `package-lock.json` con `npm version 1.8.0 --no-git-tag-version`), como en los releases anteriores
- [X] T034 [P] Agregar en `README.md` una línea sobre los temas (Clásico, Oscuro, Atardecer) y que se guardan en el navegador

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Setup (F1)** → sin dependencias.
- **Fundacional (F2)** → depende de F1; bloquea todas las historias. Su checkpoint (Clásico idéntico) es obligatorio antes de seguir.
- **US1 (F3)** → depende de F2. Es el MVP.
- **US2 (F4)** → depende de T016 (`useTheme`) y T003 (`theme.ts`). Independiente de US3.
- **US3 (F5)** → depende de T018 (`ThemeSelector`) y T019 (montaje en el sidebar). Independiente de US2.
- **Pulido (F6)** → después de las historias que se vayan a entregar.

### Dentro de cada historia

- Tests antes que implementación (T002→T003, T012→T016, T022→T025, T023→T024).
- `src/themes.css` lo tocan T004, T013, T014, T015 y T020: en orden.
- `src/components/utils/theme.ts` lo tocan T003 y T020: en orden.
- `src/hooks/useTheme.ts` lo tocan T016 y T024: en orden.
- `src/components/sidebar/index.tsx` lo tocan T010, T019 y T027: en orden.
- `src/components/sidebar/styles.css` lo tocan T005, T019 y T027: en orden.
- `src/components/themeSelector/styles.css` lo tocan T017 y T028: en orden.

### Grafo de historias

```text
F1 Setup ─► F2 Fundacional ─► US1 (MVP) ─┬─► US2 ─┐
                                         └─► US3 ─┴─► F6 Pulido
```

## Oportunidades de paralelismo

### Fase 2

```text
T002 (tests de theme.ts) en paralelo con T004 (themes.css).
Después de T004: T005, T006, T007, T008 y T009 en paralelo (un CSS cada uno).
T010 después de T005; T011 al final de la fase.
```

### Historia 1

```text
T012 (tests del hook), T013 (paleta Oscuro) y T017 (CSS del selector) en paralelo.
Luego T014 → T015 (themes.css) y T016 → T018 → T019.
```

### Historia 2

```text
T022 (test de index.html) y T023 (tests del hook) en paralelo; luego T024 y T025 en paralelo (archivos distintos).
```

### Historia 3

```text
T028 (CSS del menú) en paralelo con T027 (sidebar).
```

### Pulido

```text
T031, T033 y T034 en paralelo.
```

## Estrategia de implementación

### MVP (solo US1)

1. F1 + F2 → checkpoint: el Clásico se ve idéntico a `main`.
2. F3 (US1): cambio de tema en vivo desde el pie del panel.
3. **Parar y validar** con quickstart §1. Sirve para afinar las paletas antes de persistir nada.

> El MVP **no se debería mergear a `main` solo**: sin US2 el tema se pierde al recargar, lo que la spec considera sin valor real. US1 + US2 forman el primer entregable.

### Entrega incremental

1. F1 + F2 + US1 + US2 → PR → deploy. **Primer entregable.**
2. US3 → puede ir en el mismo PR o en uno siguiente (sin US3, con el panel colapsado no se ve el botón; hay que expandirlo para cambiar el tema).
3. F6 antes de cada merge.

## Notas de implementación (2026-11-05)

- **Verificación automatizada en navegador** (Chromium headless, sin sesión, escritorio 1280 px y celular 360 px): capturas de los tres temas con el panel expandido, colapsado y con el menú abierto, búsqueda con resaltado, menú de descarga y estado sin nota. Teclado (flechas circulares, Home/End, Escape, foco que vuelve al botón), cierre al tocar afuera, persistencia al recargar, tema aplicado antes de montar React (sin destello), valor inválido → Clásico, sincronización entre pestañas y `prefers-reduced-motion`. Sin errores en consola.
- **T021, T026 y T029 quedan pendientes (manual)**: falta probar **con sesión iniciada** (login de Google y modal de perfil en Oscuro/Atardecer), en un **celular real / PWA instalada** (color de la barra del sistema, instalación y actualización del service worker) y con el dictado grabando.
- **Desviación de US3 (celular, panel colapsado)**: en pantallas ≤ 768 px la cápsula colapsada queda como antes (avatar + expandir) y el botón de temas se usa desde el pie del panel expandido. Con un tercer botón, la cápsula tapaba el título de la nota o los íconos de la barra a 360 px. En escritorio la cápsula pasa a ser vertical (avatar, expandir, paleta) y el menú se abre a la derecha. Ver research R7.
- **Cápsula colapsada en escritorio**: con altura automática, `translateY(-50%)` la subía fuera de la pantalla y la grilla la estiraba a todo el alto. Se ancla con `top: calc(10% - 38px)` (misma posición visual que antes) y `align-self: start`.
- **`z-index: 2` en `.sidebar-container`**: sin él, el contenido de la nota (posterior en el DOM) tapaba el menú del panel colapsado.
- **Tokens extra** respecto de la tabla original: `--text-base` (color del `body`, antes el negro por defecto), `--surface-muted`, `--border-soft`, `--text-faint`, `--shadow-panel-soft`, `--shadow-card-drag` y `--success-icon` (el ✓ de "Guardado" usa `#4caf50`, distinto del verde de "copiado"). Ver data-model.
- **Clásico vs `main`** (comparación de píxeles): mismos colores calculados en textos, fondos y acentos. Diferencias residuales: el número de versión pasa de `#232730` a `#1e293b` (con opacidad 0,45, imperceptible) y suavizado de texto del panel por el nuevo contexto de apilamiento.
- **Se dejaron fijos (neutros en los tres temas)**: sombras chicas `rgba(0,0,0,.05–.1)` / `rgba(15,23,42,…)`, el fundido negro al borrar una nota y el texto blanco del botón rojo de logout.
- **Test del script inline**: importa `index.html?raw` (sin tipos de Node) y además ejecuta el script con `new Function` para comprobar que aplica el tema y tolera valores inválidos y `localStorage` bloqueado.
- **Oscuro = tema "Oscuro" de Discord, no "Ceniza"** (pedido posterior del usuario): se agregan los tokens `--surface-panel`, `--surface-input` y `--surface-floating` (iguales a `--surface` en Clásico y Atardecer) para separar panel lateral, cuadro de texto y menús como en Discord; el modal de perfil usa `--surface-floating`. `metaColor` del Oscuro pasa a `#121214` (también en el script de `index.html`). Valores en research R9. A pedido del usuario, el panel lateral usa `#1a1a1e` (el color de la nota) en vez de `#121214`, que casi no se distinguía del fondo. Las tarjetas de notas del panel tienen fondo propio en el Oscuro (`--note-card-bg: #222225`, el gris de hover de Discord, y `--note-card-hover: #2c2c30` al pasar el mouse); en Clásico y Atardecer esos tokens son `transparent`.
- **Bundle**: JS 139,2 → 140,2 kB gzip; CSS 3,9 → 5,1 kB gzip.
- **Contraste** (T030): `--text` y `--text-muted` sobre `--surface` ≥ 4,5:1 en los tres temas (Clásico 10,4/4,8; Oscuro 13,0/7,2; Atardecer 11,7/6,1). `--on-primary` sobre el acento: Clásico 2,9 (igual que antes), Oscuro 7,6, Atardecer 4,5. `--text-subtle` (placeholders, fechas) queda bajo 4,5 en Clásico (2,6, preexistente) y Atardecer (3,7).

## Notas

- [P] = archivos distintos y sin dependencias pendientes.
- Commits en Conventional Commits en español, por grupo lógico (p. ej. `refactor: pasar los colores a variables de tema`, `feat: agregar selector de temas`, `feat: recordar el tema elegido`, `chore: subir versión a 1.8.0`).
- La verificación manual de la UI se hace en **ambos modos** (sin sesión y con sesión) antes de mergear (constitución, "Flujo de Desarrollo y Calidad").
