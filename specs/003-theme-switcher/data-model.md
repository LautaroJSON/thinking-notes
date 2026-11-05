# Modelo de datos: Selector de temas visuales

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

No hay cambios en la base de datos, en la API ni en el tipo `INotes`. El único dato
persistido es la preferencia de tema en `localStorage`.

## Entidad: Tema (`ThemeId`)

Catálogo fijo, definido en código (`src/components/utils/theme.ts`).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `"classic" \| "dark" \| "sunset"` | Identificador estable; es el valor que se guarda y el de `data-theme`. |
| `label` | `string` | Nombre en la UI: "Clásico", "Oscuro", "Atardecer". |
| `metaColor` | `string` (hex) | Color para `<meta name="theme-color">`. |

```ts
// Forma prevista (no es código final)
export const THEME_IDS = ["classic", "dark", "sunset"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export interface ThemeOption { id: ThemeId; label: string; metaColor: string }
```

Orden en el menú: Clásico, Oscuro, Atardecer.

## Entidad: Preferencia de tema

| Atributo | Valor |
|---|---|
| Ubicación | `localStorage`, clave `"theme"` |
| Formato | texto plano: `"dark"` o `"sunset"` |
| Ausencia de clave | equivale a `"classic"` |
| Alcance | por navegador/dispositivo; independiente de la sesión y de la cuenta |

### Reglas de validación

- `isThemeId(value: unknown): value is ThemeId` → `true` solo para los tres ids.
- Leer: valor ausente, inválido o error al acceder a `localStorage` → `"classic"`.
- Guardar `"classic"` → se borra la clave (`removeItem`).
- Guardar otro tema → `setItem("theme", id)`.
- Error al escribir → se registra con `console.error`; el tema se aplica igual.

### Transiciones de estado

```text
           elegir tema X            recargar / abrir
[tema A] ───────────────▶ [tema X] ──────────────────▶ [tema X]   (si se pudo guardar)
                                   ──────────────────▶ [classic]  (si el almacenamiento falló)
cambio en otra pestaña (evento storage) ─▶ esta pestaña aplica el nuevo valor validado
iniciar / cerrar sesión ─▶ sin cambios
```

## Tokens de color (variables CSS)

Definidos en `src/themes.css`. El tema **Oscuro usa la paleta del tema "Oscuro" de Discord** (no "Ceniza"; pedido del usuario, 2026-11-05). Para eso se agregan tres superficies que en Clásico y Atardecer valen `var(--surface)`: `--surface-panel` (panel lateral, Oscuro `#1a1a1e`, igual que la nota para que se distinga del fondo `#121214`), `--surface-input` (cuadro de texto, `#222327`) y `--surface-floating` (menús desplegables y modal de perfil, `#252429`). Clásico en `:root`; los otros temas sobrescriben en
`:root[data-theme="…"]`. Valores iniciales (ajustables en la implementación si la
verificación de contraste lo pide):

| Token | Uso | Clásico (actual) | Oscuro | Atardecer |
|---|---|---|---|---|
| `--bg-gradient` | fondo del `body` | `#ffffff → #e6e5fe → #c6cdfe → #9fb8ff → #7890ff` | `#121214 → #141416 → #17171a → #1a1a1e` | `#fff7ed → #ffe1cc → #ffc4a8 → #f6a192 → #d9a3d6` |
| `--surface` | panel, tarjetas, modal, menús | `#ffffff` | `#1a1a1e` | `#fffaf3` |
| `--surface-alt` | encabezados, fondos sutiles (`#fafbfc`, `#f1f5f9`, `#f8fafc`) | `#f8fafc` | `#1a1a1e` | `#fbf1e6` |
| `--surface-hover` | hover de filas (`rgba(0,0,0,.05)`) | `rgba(0,0,0,.05)` | `rgba(255,255,255,.04)` | `rgba(120,60,40,.06)` |
| `--border` | bordes suaves (`#e2e8f0`, `#eef2f6`) | `#e2e8f0` | `#29292d` | `#f0dccb` |
| `--border-strong` | separadores (`#d1d1d1`) | `#d1d1d1` | `#323237` | `#e6c9b4` |
| `--text-strong` | títulos (`#1e293b`, `#1f1f1f`) | `#1e293b` | `#fbfbfb` | `#2e1c16` |
| `--text` | texto principal (`#334155`, `#333`) | `#334155` | `#efeff1` | `#4a2f27` |
| `--text-muted` | secundario (`#64748b`, `#666`, `#777`) | `#64748b` | `#abacb2` | `#7d5646` |
| `--text-subtle` | placeholders, fechas (`#94a3b8`, `#8b8b8b`) | `#94a3b8` | `#96979e` | `#ad8574` |
| `--primary-color` | acento | `#7890ff` | `#5865f2` | `#c2553a` |
| `--primary-soft` | fondo de chips/acento suave (`#eef1ff`) | `#eef1ff` | `rgba(88,101,242,.2)` | `#fbe4dc` |
| `--on-primary` | texto/íconos sobre el acento | `#ffffff` | `#ffffff` | `#ffffff` |
| `--success` / `--success-soft` | "guardado" | `#16a34a` / `#ecfdf5` | `#45a366` / `rgba(69,163,102,.15)` | `#3f8a4a` / `#e8f3e3` |
| `--danger` / `--danger-soft` | errores, borrar, grabando | `#ef4444` / `#fef2f2` | `#da3e44` / `rgba(218,62,68,.15)` | `#c0392b` / `#fde8e4` |
| `--highlight` / `--on-highlight` | resaltado de búsqueda | `#facc15` / `#1a1a1a` | `#f0b232` / `#121214` | `#f5b841` / `#2e1c16` |
| `--overlay` | fondo del modal | `rgba(0,0,0,.5)` | `rgba(0,0,0,.7)` | `rgba(46,28,22,.5)` |
| `--shadow-panel` | sombra del panel y la nota | `0 8px 32px rgba(31,38,135,.37)` | `0 8px 16px rgba(0,0,0,.32)` | `0 8px 32px rgba(150,70,50,.28)` |
| `--shadow-card` | sombra de ítems de nota | `0 2px 8px rgba(63,68,138,.3)` | líneas de 1–2 px negras | `0 2px 8px rgba(150,70,50,.22)` |
| `--scrollbar` | barra de desplazamiento | `var(--primary-color)` | `#323237` | `var(--primary-color)` |
| `--text-base` | color del `body` (texto sin color propio) | `#000000` | `#efeff1` | `#2e1c16` |
| `--surface-muted` | hover de ideas y del menú de descarga (`#f1f5f9`) | `#f1f5f9` | `#222225` | `#f9ebdd` |
| `--border-soft` | separadores de la barra y el buscador (`#eef2f6`) | `#eef2f6` | `#29292d` | `#f5e6d8` |
| `--text-faint` | placeholder del título (`#cbd5e1`) | `#cbd5e1` | `#81828a` | `#dcc3b3` |
| `--success-icon` | ✓ de "Guardado" (`#4caf50`) | `#4caf50` | `#45a366` | `#3f8a4a` |
| `--shadow-panel-soft` / `--shadow-card-drag` | cápsula en celular / nota arrastrada | valores actuales | sombras negras | sombras terracota |
| `--note-card-bg` / `--note-card-hover` | fondo de las tarjetas de notas del panel / al pasar el mouse | `transparent` | `#222225` / `#2c2c30` | `transparent` |
| `metaColor` (no es token CSS) | `<meta name="theme-color">` | `#ffffff` | `#121214` | `#fff7ed` |

Las variables viejas (`--negro`, `--negro-2`, `--gris-oscuro`) se reemplazan por los
tokens equivalentes (`--text-strong`, `--text`, etc.) donde se usan y luego se eliminan.
