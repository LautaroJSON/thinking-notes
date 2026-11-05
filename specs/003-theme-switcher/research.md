# Research: Selector de temas visuales

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-11-05

Decisión de producto confirmada por el usuario: **Opción A** (botón con ícono de paleta en
el pie del panel lateral).

## R1. Mecanismo de temas: atributo `data-theme` + variables CSS

- **Decisión**: definir los colores como custom properties (tokens) en `:root`
  (tema Clásico) y sobrescribirlas en `:root[data-theme="dark"]` y
  `:root[data-theme="sunset"]`, en un archivo nuevo `src/themes.css` importado desde
  `src/index.css`. El tema se aplica poniendo `data-theme` en `<html>`.
- **Por qué**: cambiar un atributo re-pinta toda la interfaz al instante (SC-002) sin
  re-renderizar React ni tocar el estado de las notas (FR-004). Es CSS nativo, como pide
  el principio V, y deja el Clásico idéntico al actual si los tokens toman los valores de
  hoy (FR-013, SC-007).
- **Alternativas descartadas**:
  - Clases por tema en cada componente: obliga a tocar el JSX de todos los componentes y
    duplica reglas.
  - Librería de theming (styled-components, theme-ui, etc.): agrega runtime y bundle para
    algo que CSS resuelve solo.
  - Hojas de estilo por tema cargadas dinámicamente: provoca destello y complica la PWA.

## R2. Inventario y tokenización de colores

- **Hallazgo**: hay ~120 colores fijos repartidos en 7 archivos CSS
  (`index.css`, `sidebar`, `noteItem`, `noteContent` ~700 líneas, `profile`,
  `appVersion`, `App.css`) y 4 íconos con `color="white"` en
  `src/components/sidebar/index.tsx`. Solo existen 4 variables (`--negro`, `--negro-2`,
  `--gris-oscuro`, `--primary-color`).
- **Decisión**: reemplazar cada color fijo por un token semántico (ver
  [data-model.md](./data-model.md) › Tokens). Los grises equivalentes se agrupan en un
  mismo token (por ejemplo `#334155`, `#333` → `--text`; `#94a3b8`, `#8b8b8b` →
  `--text-subtle`). Los íconos dejan de recibir `color="white"` y heredan
  `color: var(--on-primary)` del botón (`currentColor`, comportamiento por defecto de
  Lucide).
- **Colores con transparencia** (`rgba(120,144,255,…)`, sombras): se expresan con
  `color-mix(in srgb, var(--primary-color) 15%, transparent)` o con tokens de sombra
  propios por tema (`--shadow-panel`, `--shadow-card`). `color-mix` tiene soporte en todos
  los navegadores objetivo (Chrome 111+, Safari 16.2+, Firefox 113+).
- **Estados** (guardado verde, error rojo, resaltado amarillo, grabando): tokens propios
  (`--success`, `--danger`, `--highlight`…) con valores ajustados por tema para mantener
  contraste (FR-012).
- **Alternativa descartada**: tematizar solo fondo y superficies dejando el resto fijo.
  Deja textos grises oscuros sobre fondo oscuro (viola FR-011 y SC-005).

## R3. Evitar el destello del tema Clásico al cargar (FR-008, SC-004)

- **Decisión**: script inline y síncrono en el `<head>` de `index.html`, antes del CSS de
  la app, que lee `localStorage["theme"]`, valida que sea `dark` o `sunset` y pone
  `document.documentElement.dataset.theme` y el `content` de
  `<meta name="theme-color">`. Todo dentro de `try/catch` (almacenamiento bloqueado →
  Clásico).
- **Por qué**: el bundle de React se ejecuta después del primer pintado; aplicar el tema
  ahí produce un destello visible. Un script inline de ~10 líneas corre antes del primer
  pintado.
- **Riesgo**: la clave y la lista de temas quedan duplicadas entre `index.html` y
  `src/components/utils/theme.ts`. **Mitigación**: un test lee `index.html` y verifica que
  la clave y los ids coincidan con las constantes de `theme.ts`.
- **CSP**: el proyecto no define Content-Security-Policy (Vercel sin headers
  personalizados), así que el script inline no se bloquea. Si en el futuro se agrega una
  CSP, habrá que permitir su hash.
- **Alternativas descartadas**: leer el tema en `main.tsx` antes de `createRoot` (sigue
  después de que el HTML se pintó con el CSS), cookie leída por el servidor (no hay SSR).

## R4. Estado del tema en React

- **Decisión**: módulo puro `src/components/utils/theme.ts` (constantes, validación,
  leer/guardar/aplicar) + hook `src/hooks/useTheme.ts` basado en `useSyncExternalStore`
  que se suscribe a cambios locales y al evento `storage` (otras pestañas).
- **Por qué**: hoy un solo componente necesita el tema (el selector), así que no se
  justifica un Provider nuevo; `useSyncExternalStore` igual permite que otros componentes
  lo lean sin duplicar estado. El evento `storage` da sincronización entre pestañas casi
  gratis (edge case "varias pestañas", deseable).
- **Fuente de verdad**: el atributo `data-theme` de `<html>` (lo pone el script inline y
  lo actualiza `applyTheme`). La preferencia guardada es la persistencia.
- **Alternativa descartada**: guardar el tema en `NotesContext`: mezcla una preferencia
  visual con la lógica de notas y provocaría re-renders de todo el árbol de notas.

## R5. Persistencia (FR-007, FR-009, FR-010)

- **Decisión**: clave `localStorage["theme"]` con valor de texto plano (`classic`,
  `dark`, `sunset`), igual en modo sin sesión y con sesión. Sin cambios en
  `src/services` ni en el backend.
- **Validación**: cualquier valor que no sea uno de los ids conocidos → `classic`.
  Elegir `classic` borra la clave (el estado por defecto no deja rastro).
- **Errores**: lectura y escritura envueltas en `try/catch` siguiendo el patrón de
  `src/components/utils/drafts.ts`; si escribir falla, el tema se aplica igual en la
  sesión actual y se registra con `console.error`, sin mostrar errores al usuario.

## R6. Selector (UI y accesibilidad)

- **Decisión**: componente `src/components/themeSelector/` con el patrón ya usado en
  `downloadMenu.tsx` (botón con `aria-haspopup="menu"` + `aria-expanded`, cierre al tocar
  afuera o con Escape), extendido con:
  - ítems `role="menuitemradio"` con `aria-checked` para marcar el tema activo;
  - navegación con flechas ↑/↓ (y Home/End), Enter/Espacio para elegir;
  - foco al ítem activo al abrir y foco de vuelta al botón al cerrar.
- **Ícono**: `Palette` de `lucide-react` (ya es dependencia); `Check` para el activo.
- **Muestra de color**: un círculo con el degradado/colores del tema, definido con los
  mismos tokens leídos desde un selector `[data-theme-preview="…"]` para no duplicar
  valores en TS.
- **Por qué no reutilizar `DownloadMenu` tal cual**: sus estilos (`note-info-popover`)
  están atados al encabezado de la nota y no tiene semántica de radio ni teclado con
  flechas. Se copia el patrón (≈40 líneas), no se crea una abstracción genérica para dos
  usos.

## R7. Ubicación y despliegue (Opción A)

- **Panel expandido**: nuevo pie `.sidebar-footer` después de `.sidebar-notes-list`
  (que tiene `height: 100%` + scroll, así que el pie queda fijo abajo y la lista se
  achica sin taparse). El menú se abre **hacia arriba**, alineado a la izquierda del
  botón, por encima de la lista (`z-index` sobre los ítems).
- **Panel colapsado**: el panel colapsado es una cápsula de 80×76 px (60 px de ancho en
  celular) con avatar y botón de expandir. Se agrega el botón de paleta debajo de ellos y
  la cápsula pasa a altura automática. El menú se abre **hacia la derecha** de la
  cápsula para no quedar recortado.
- **Celular (≤ 768 px)**: el menú tiene ancho máximo `calc(100vw - 32px)` y se
  reposiciona para no salir de pantalla (SC-006). Botón de al menos 40×40 px.
- **Ajuste en implementación**: en celular (≤ 768 px) la cápsula colapsada se superpone a
  la barra de la nota y un tercer botón tapaba el título o los íconos de la barra. Por eso
  en celular la cápsula queda como antes y el selector se usa desde el pie del panel
  expandido; en escritorio la cápsula es vertical (avatar, expandir, paleta), anclada con
  `top: calc(10% - 38px)` y `align-self: start`.
- **Nota sobre la spec**: la spec dice "al pie de la barra angosta" para el estado
  colapsado; en la app real el colapsado es una cápsula, por eso el botón se suma dentro
  de ella. Mantiene la intención (siempre visible) sin cambiar requisitos.

## R8. Color de la barra del navegador/PWA (FR-015, FR-016)

- **Decisión**: agregar `<meta name="theme-color">` en `index.html` (valor del Clásico)
  y actualizar su `content` en `applyTheme` (y en el script inline). El
  `theme_color` del manifest de `vite.config.ts` queda en `#ffffff`: el manifest es
  estático y solo afecta el splash; la meta tag manda en tiempo de ejecución.
- **PWA**: no se tocan `registerSW` ni la configuración de `VitePWA`; el script inline
  queda dentro de `index.html`, que el service worker ya precachea.

## R9. Paletas y contraste

- **Decisión**: tres paletas con valores concretos en [data-model.md](./data-model.md).
  Clásico = valores actuales. Oscuro con acento azul aclarado (`#8fa2ff`) y texto oscuro
  sobre el acento. Atardecer con superficies crema y acento terracota (`#c2553a`).
- **Verificación**: contraste AA (≥ 4.5:1 texto normal, ≥ 3:1 íconos y texto grande)
  de `--text` y `--text-muted` sobre `--surface`, y de `--on-primary` sobre
  `--primary-color`, chequeado con las DevTools del navegador durante la verificación
  manual ([quickstart.md](./quickstart.md)).
- **Excepción conocida**: en Clásico, el blanco sobre `#7890ff` (botones redondos) da
  ~3:1. Es igual que hoy y aplica a íconos (umbral 3:1), así que se mantiene por FR-013.

- **Cambio posterior (2026-11-05)**: a pedido del usuario, el Oscuro pasa a la paleta del
  tema **"Oscuro" de Discord** (desde el rediseño de 2025 Discord tiene Claro, Ceniza,
  Oscuro y Ónix; los grises `#313338`/`#2b2d31`/`#1e1f22` que se usaron primero son los
  del oscuro anterior, hoy Ceniza). Valores tomados de mediciones de terceros sobre el
  cliente (no hay documentación oficial de los tokens): chat `#1a1a1e`, panel/barra de
  título `#121214`, input `#222327`, menús `#252429`, bordes `#29292d`, textos `#fbfbfb`
  / `#efeff1` / `#abacb2` / `#96979e` / `#81828a`. Contraste sobre `#1a1a1e`: texto
  15,1:1, secundario 7,7:1, sutil 6,0:1, placeholder 4,5:1; blanco sobre `#5865f2` 4,6:1.

## R10. Transición (FR-014)

- **Decisión**: `transition: background-color .2s, color .2s, border-color .2s` en las
  superficies principales, activada solo durante el cambio de tema (clase
  `theme-transition` en `<html>` por ~250 ms) para que no afecte la carga inicial ni las
  animaciones existentes. Se desactiva con `prefers-reduced-motion: reduce`.
- **Nota**: el degradado del `body` no se puede animar con `transition`; cambia de golpe,
  lo cual es aceptable.
