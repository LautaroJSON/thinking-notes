# Contrato de almacenamiento: preferencia de tema

**Módulo**: `src/components/utils/theme.ts` (+ script inline en `index.html`)

## Clave

| Clave | Tipo | Valores válidos | Por defecto |
|---|---|---|---|
| `localStorage["theme"]` | `string` | `"dark"`, `"sunset"` (`"classic"` se acepta al leer) | ausente → `"classic"` |

- Igual en modo sin sesión y con sesión. **No** se envía a la API ni se guarda en la base
  de datos (pedido explícito del usuario, "de momento").
- No se borra al cerrar sesión.

## Funciones expuestas (forma prevista)

| Función | Comportamiento |
|---|---|
| `THEME_STORAGE_KEY` | `"theme"` |
| `THEME_IDS` / `THEMES` | catálogo de [data-model.md](../data-model.md) |
| `isThemeId(value: unknown)` | type guard; `true` solo para los tres ids |
| `loadTheme(): ThemeId` | lee la clave; ausente/inválido/error → `"classic"`; nunca lanza |
| `saveTheme(id: ThemeId): void` | `classic` → `removeItem`; otro → `setItem`; error → `console.error`, nunca lanza |
| `applyTheme(id: ThemeId): void` | pone/quita `data-theme` en `<html>` y actualiza `<meta name="theme-color">` |
| `getAppliedTheme(): ThemeId` | lee `data-theme` de `<html>` validado (fuente de verdad en ejecución) |

## Script inline de `index.html`

Debe hacer lo mismo que `loadTheme` + `applyTheme`, antes del primer pintado:

1. `try { v = localStorage.getItem("theme") } catch {}`
2. Si `v` es `"dark"` o `"sunset"`: `document.documentElement.dataset.theme = v` y
   actualizar `meta[name=theme-color]` con el color del tema.
3. Cualquier otro caso: no hace nada (queda Clásico).

**Invariante verificado por test**: la clave y los ids no clásicos del script coinciden
con `THEME_STORAGE_KEY` y `THEME_IDS` de `theme.ts`.
