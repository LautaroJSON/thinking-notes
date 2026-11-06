# Modelo de datos: Sonidos de interacción

No hay datos remotos: todo vive en el navegador. No se toca la API ni Supabase.

## SoundCategory

Grupo de sonidos que se silencian juntos.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | `"typing" \| "selection" \| "actions"` | Estable; se usa como clave en la preferencia. |
| label | `string` | Nombre en el menú: "Escritura", "Selección", "Acciones". |

Constante `SOUND_CATEGORIES` (orden del menú: Escritura, Selección, Acciones).

## SoundId

Evento sonoro concreto. Cada uno pertenece a una sola categoría.

| SoundId | Categoría | Se dispara cuando |
|---------|-----------|-------------------|
| `key` | typing | Se inserta texto tecleado (carácter o espacio). |
| `delete` | typing | Se borra texto con Backspace/Supr. |
| `enter` | typing | Salto de línea / Enter en un campo. |
| `select` | selection | Abrir un menú, elegir tema, cambiar un interruptor. |
| `noteOpen` | selection | Seleccionar (abrir) una nota. |
| `noteClose` | selection | Deseleccionar (cerrar) la nota abierta. |
| `close` | selection | Cerrar un menú sin elegir (afuera, Escape, botón). |
| `panelOpen` | selection | Expandir el panel lateral. |
| `panelClose` | selection | Colapsar el panel lateral. |
| `create` | actions | Nota creada con éxito. |
| `send` | actions | Idea agregada (texto o imágenes). |
| `remove` | actions | Nota borrada con éxito; idea borrada. |
| `copy` | actions | Copia al portapapeles con éxito; descarga generada. |
| `drop` | actions | Nota soltada en una posición nueva al reordenar. |
| `paste` | actions | Pegado de imagen o texto. |
| `dictationStart` | actions | Empieza el dictado. |
| `dictationStop` | actions | Termina el dictado. |

Mapa `SOUND_CATEGORY: Record<SoundId, SoundCategoryId>`.

## SoundPreferences (resuelta, en memoria)

| Campo | Tipo | Default |
|-------|------|---------|
| enabled | `boolean` | `true` |
| typing | `boolean` | `true` con puntero principal fino (computadora); `false` con puntero grueso (táctil). |
| selection | `boolean` | `true` |
| actions | `boolean` | `true` |

**Regla de reproducción**: un sonido suena sólo si `enabled && prefs[categoría]` y la pestaña está visible.

## StoredSoundPreferences (persistida)

Clave `localStorage`: `"sounds"`. Valor JSON con **solo los campos que el usuario cambió**:

```json
{ "enabled": false, "typing": true }
```

Validación al leer (`loadSoundPreferences`):

- JSON inválido, `null`, no-objeto o array → se ignora todo (defaults).
- Cada campo se toma solo si es `boolean`; claves desconocidas se descartan.
- `localStorage` que lanza → defaults, sin errores visibles.

Escritura (`saveSoundPreferences`): se guarda el objeto de overrides; si queda vacío se borra la clave. Un error de `localStorage` se registra en consola y la preferencia sigue aplicándose en memoria.

## Transiciones

```text
Interruptor general ON ──apagar──▶ OFF   (las categorías conservan su valor)
          ▲                         │
          └────────encender─────────┘   (vuelve exactamente lo anterior)

Categoría X ON ⇄ OFF   (independiente del general; si general está OFF,
                        el cambio se guarda pero no suena nada)
Encender una categoría (con general ON) → suena una muestra de esa categoría.
```

Cambio en otra pestaña (`storage` con clave `"sounds"`) → se recarga la preferencia y se notifica a los suscriptores.
