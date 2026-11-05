# Contrato UI: Reordenar notas en el sidebar

**Componentes**: `src/components/sidebar/index.tsx`, `src/components/notes/noteItem/index.tsx`

## Gestos

| Entrada | Gesto | Resultado |
|---|---|---|
| Mouse | Clic sin mover (< 6 px) | Abre/cierra la nota (igual que hoy). |
| Mouse | Clic + arrastrar ≥ 6 px | Inicia arrastre. |
| Táctil | Toque breve | Abre/cierra la nota. |
| Táctil | Deslizar antes de 400 ms (> 6 px) | Scroll normal de la lista; no hay arrastre. |
| Táctil | Mantener apretado 400 ms quieto | La nota se levanta (feedback visual + vibración leve si existe). |
| Ambos | Soltar sobre otra posición de la lista | Se guarda el nuevo orden. |
| Ambos | Soltar fuera de la lista / misma posición | Sin cambios, sin guardado. |
| Teclado | `Escape` durante el arrastre | Cancela; vuelve al orden anterior. |

## Estados visuales

| Estado | Señal |
|---|---|
| Arrastrando | Ítem elevado (sombra + `scale(1.02)`), cursor `grabbing`; los vecinos se desplazan para mostrar el destino (~150 ms). |
| Guardando orden (online) | Indicador de carga pequeño en el sidebar mientras `waitingResponse === "reorderingNotes"`. |
| Error al guardar | Mensaje inline en el sidebar: "No se pudo guardar el orden de las notas." Se oculta solo a los ~4 s. La lista vuelve al orden anterior. |
| Deshabilitado | Mientras `waitingResponse !== "none"` o panel colapsado: no se puede iniciar el arrastre; el clic sigue funcionando. |

## Props de `NoteItem`

Sin cambios de props públicas obligatorias. El componente usa `useSortable({ id, disabled })`
y aplica `attributes`, `listeners`, `setNodeRef` y `style` (transform/transition) a su
contenedor. `disabled` se calcula a partir de `waitingResponse` del contexto (o se pasa
como prop desde el sidebar).

## Estilos requeridos en el ítem

- `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`.
- `touch-action: manipulation` (no `none`, para no romper el scroll).
- La nota activa mantiene su clase `active` mientras se arrastra y después de soltarla.
