# Contrato UI: Selector de temas

**Componente nuevo**: `src/components/themeSelector/index.tsx` (+ `styles.css`)
**Se monta en**: `src/components/sidebar/index.tsx`, en el pie del panel expandido y
dentro de la cápsula del panel colapsado.

## Botón

| Atributo | Valor |
|---|---|
| Ícono | `Palette` (lucide-react), hereda `color: var(--on-primary)` |
| Estilo | botón circular como los existentes (`.circular-button`), ≥ 40×40 px |
| `aria-label` / `title` | "Cambiar tema" |
| `aria-haspopup` | `"menu"` |
| `aria-expanded` | `true` con el menú abierto |
| `aria-controls` | id del menú (`useId`) |

## Menú

| Atributo | Valor |
|---|---|
| Contenedor | `role="menu"`, `aria-label="Temas"` |
| Ítems | uno por tema, en orden Clásico, Oscuro, Atardecer; `role="menuitemradio"`, `aria-checked` en el activo |
| Contenido del ítem | muestra de color circular (`data-theme-preview="<id>"`) + nombre + `Check` si está activo |
| Posición (expandido) | se abre hacia arriba desde el pie, alineado a la izquierda del botón |
| Posición (colapsado) | se abre hacia la derecha de la cápsula |
| Celular (≤ 768 px) | completo en pantalla, ancho máx. `calc(100vw - 32px)`, sin scroll horizontal |

## Interacciones

| Entrada | Resultado |
|---|---|
| Clic/toque en el botón | Abre o cierra el menú. Al abrir, el foco va al tema activo. |
| Clic/toque en un tema | Aplica y guarda el tema; cierra el menú; foco vuelve al botón. |
| Clic/toque fuera del menú | Cierra sin cambiar el tema. |
| `Escape` | Cierra sin cambiar; foco vuelve al botón. |
| `↑` / `↓` | Mueve el foco entre temas (circular). |
| `Home` / `End` | Primer / último tema. |
| `Enter` / `Espacio` | Elige el tema enfocado. |
| `Tab` | Cierra el menú y sigue el orden normal de foco. |

## Efectos de elegir un tema

1. `<html data-theme="…">` cambia (Clásico = sin atributo o `classic`).
2. `<meta name="theme-color">` toma el `metaColor` del tema.
3. Se guarda la preferencia ([storage-theme.md](./storage-theme.md)).
4. Transición de colores ~200 ms (sin transición con `prefers-reduced-motion`).
5. No cambia ningún estado de notas, borradores, dictado ni guardado pendiente.

## Hook `useTheme`

```ts
// Forma prevista
function useTheme(): {
  theme: ThemeId;                 // tema activo
  themes: readonly ThemeOption[]; // catálogo en orden de menú
  setTheme(id: ThemeId): void;    // aplica + guarda + notifica suscriptores
};
```

Se re-renderiza cuando cambia el tema en esta pestaña o en otra (evento `storage`).
