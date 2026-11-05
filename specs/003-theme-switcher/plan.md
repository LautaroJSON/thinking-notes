# Plan de implementación: Selector de temas visuales

**Branch**: `feat/theme-switcher` (a crear desde `main`) | **Fecha**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Especificación de `specs/003-theme-switcher/spec.md`

## Resumen

Agregar tres temas (Clásico, Oscuro, Atardecer) que el usuario elige desde un botón con
ícono de paleta en el **pie del panel lateral** (Opción A, confirmada por el usuario). La
preferencia se guarda en `localStorage` en ambos modos, sin tocar la API ni la base de
datos.

Enfoque técnico (ver [research.md](./research.md)):

- **Estilos**: tokens de color como variables CSS en un nuevo `src/themes.css`; el
  Clásico en `:root` con los valores actuales y los otros temas en
  `:root[data-theme="dark" | "sunset"]`. Se reemplazan los ~120 colores fijos de los 7
  archivos CSS y los `color="white"` de los íconos del sidebar por tokens.
- **Sin destello**: script inline en el `<head>` de `index.html` que aplica el tema
  guardado antes del primer pintado, más `<meta name="theme-color">` dinámica.
- **Lógica**: módulo puro `src/components/utils/theme.ts` (validar/leer/guardar/aplicar)
  y hook `src/hooks/useTheme.ts` con `useSyncExternalStore` (incluye sincronización entre
  pestañas vía evento `storage`).
- **UI**: componente `src/components/themeSelector/` (menú accesible con
  `menuitemradio`, teclado y cierre al tocar afuera), montado en el pie del sidebar
  expandido y dentro de la cápsula del colapsado.

## Contexto técnico

**Language/Version**: TypeScript ~5.9 (strict), React 19.2

**Primary Dependencies**: Vite 7, Context API, lucide-react (íconos `Palette`, `Check`),
vite-plugin-pwa. **Sin dependencias nuevas.**

**Storage**: `localStorage`, clave `theme` (ambos modos). Sin cambios en Supabase, la API
ni `src/services`.

**Testing**: Vitest 5 + Testing Library + jsdom

**Target Platform**: PWA en navegadores modernos de escritorio y móvil (Chrome/Android,
Safari/iOS 16.2+, Firefox), desplegada en Vercel

**Project Type**: aplicación web (SPA/PWA); solo frontend

**Performance Goals**: cambio de tema percibido como instantáneo (un cambio de atributo,
sin re-render del árbol de notas); cero destello del tema por defecto al cargar

**Constraints**: Clásico idéntico al actual (FR-013); funciona sin sesión, sin red y con
`localStorage` bloqueado; contraste AA del texto principal en los tres temas; no romper
la PWA

**Scale/Scope**: 3 temas, ~20 tokens; 7 archivos CSS a tokenizar (`noteContent` es el más
grande, ~700 líneas), 1 componente nuevo, 1 módulo + 1 hook, cambios en `index.html` y
`sidebar`

## Constitution Check

*GATE: debe pasar antes de la Fase 0. Re-chequeado después de la Fase 1.*

| Principio | Cumplimiento | Detalle |
|---|---|---|
| I. Paridad Offline/Online | ✅ | La preferencia vive en `localStorage` igual con y sin sesión; no depende de la red ni del login. El botón está en el sidebar (visible en ambos modos), no en el perfil. Iniciar/cerrar sesión no cambia el tema. |
| II. Minimalista y fluida | ✅ | Un solo botón al pie del panel, sin confirmaciones; el cambio es instantáneo y se guarda solo. Transición sutil (~200 ms) que respeta `prefers-reduced-motion`. Menú usable en celular. Textos en español. El fallo de almacenamiento no rompe la UI (degrada a "no se recuerda"). |
| III. Tests para la lógica | ✅ | Tests de `theme.ts` (validación, lectura/escritura, errores de `localStorage`, `applyTheme`, coincidencia con el script de `index.html`) y de `useTheme` (cambio local y entre pestañas). La UI se verifica a mano según [quickstart.md](./quickstart.md). |
| IV. TypeScript estricto | ✅ | `ThemeId` como unión literal derivada de `THEME_IDS`; `isThemeId` como type guard para valores de `localStorage` (`unknown` validado). Sin `any`. Tipos junto al módulo `theme.ts`. |
| V. Stack estable | ✅ | Solo CSS nativo (custom properties, `color-mix`) y React; íconos de Lucide ya instalados. Sin librerías nuevas. |
| Restricciones técnicas | ✅ | Sin llamadas de red nuevas. `index.html` sigue precacheado por el SW; no se toca `registerSW` ni la config de `VitePWA`. El script inline no contiene secretos. Rutas sin cambios. |

**Re-chequeo post-diseño (Fase 1)**: ✅ sin violaciones. El diseño mantiene los cinco
principios; la única duplicación (clave e ids en el script inline) se cubre con un test.

## Estructura del proyecto

### Documentación (esta feature)

```text
specs/003-theme-switcher/
├── plan.md                      # Este archivo
├── research.md                  # Fase 0
├── data-model.md                # Fase 1: tema, preferencia y tabla de tokens
├── quickstart.md                # Fase 1: validación automática y manual
├── contracts/
│   ├── theme-selector-ui.md     # Botón, menú, teclado, hook useTheme
│   └── storage-theme.md         # Clave de localStorage y funciones de theme.ts
├── checklists/requirements.md
└── tasks.md                     # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Código fuente (raíz del repo)

```text
index.html                                  # MOD: script inline de tema + <meta name="theme-color">
src/
├── index.css                               # MOD: importa themes.css; body/scrollbar usan tokens
├── themes.css                              # NUEVO: tokens de :root (Clásico) + dark + sunset + transición
├── components/
│   ├── utils/
│   │   ├── theme.ts                        # NUEVO: catálogo, isThemeId, load/save/apply
│   │   └── theme.test.ts                   # NUEVO
│   ├── themeSelector/
│   │   ├── index.tsx                       # NUEVO: botón de paleta + menú
│   │   └── styles.css                      # NUEVO
│   ├── sidebar/
│   │   ├── index.tsx                       # MOD: monta ThemeSelector (pie + cápsula); quita color="white"
│   │   └── styles.css                      # MOD: .sidebar-footer, cápsula de altura automática, tokens
│   ├── notes/noteContent/styles.css        # MOD: tokens
│   ├── notes/noteItem/styles.css           # MOD: tokens
│   ├── profile/styles.css                  # MOD: tokens
│   └── appVersion/styles.css               # MOD: tokens
└── hooks/
    ├── useTheme.ts                         # NUEVO: useSyncExternalStore + evento storage
    └── useTheme.test.ts                    # NUEVO
```

**Structure Decision**: proyecto único de frontend. Se siguen las convenciones
existentes: utilidades puras con su test en `src/components/utils`, hooks en
`src/hooks`, un componente por carpeta con `index.tsx` + `styles.css`. Los tokens
globales van en `src/themes.css` para no mezclar la paleta con los estilos base de
`index.css`.

## Orden sugerido de implementación

1. `theme.ts` + tests (lógica pura, sin UI).
2. `themes.css` con el Clásico en `:root` usando los valores actuales; tokenizar los 7
   CSS y los íconos. **Checkpoint**: la app se ve idéntica a `main` (FR-013).
3. Valores de Oscuro y Atardecer en `themes.css`.
4. Script inline + meta `theme-color` en `index.html` + test de coincidencia.
5. `useTheme` + tests.
6. `ThemeSelector` y montaje en el sidebar (expandido y colapsado).
7. Transición, ajustes de celular y verificación manual completa del quickstart.

## Complexity Tracking

Sin violaciones a la constitución; no aplica.
