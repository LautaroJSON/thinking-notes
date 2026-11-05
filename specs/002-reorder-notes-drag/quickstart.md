# Quickstart: validar el reordenamiento de notas

**Feature**: [spec.md](./spec.md) · Contratos: [API](./contracts/api-notes-order.md), [UI](./contracts/sidebar-reorder-ui.md)

## Prerrequisitos

- Backend `thinking-notes-backend` con la migración de `position` aplicada y
  `PUT /notes/order` disponible (local o desplegado).
- Frontend con `VITE_API_BASE_URL` apuntando a ese backend (`.env.local`).
- Un celular (o DevTools con emulación táctil) para la Historia 3.

## Gates automáticos

```bash
npm test
```

```bash
npm run build
```

```bash
npm run lint
```

Esperado: tests verdes (incluyen `moveNote`, `reorderNotes` en ambos modos, reversión
ante error y la carrera de R5); build OK; lint sin errores nuevos respecto de `main`.
Anotar el tamaño del chunk principal antes/después para confirmar el costo de dnd-kit
(research R1, ~15–18 kB gzip).

Backend (en `thinking-notes-backend`): `npm test` con los tests del endpoint nuevo.

## Verificación manual — modo sin sesión

1. `npm run dev`, sin iniciar sesión. Crear notas A, B, C, D.
2. Arrastrar D antes de A → lista D, A, B, C. Recargar → mismo orden. (Historia 2, SC-002)
3. Clic breve sobre B → se abre B; no hubo arrastre. (SC-004)
4. Empezar a arrastrar C y presionar `Escape` → vuelve al orden anterior.
5. Soltar una nota en su mismo lugar → nada cambia.
6. Abrir B, arrastrarla → sigue abierta y resaltada.
7. Crear una nota nueva → aparece al final. Borrar A → el resto conserva su orden.
8. Con ~15 notas, arrastrar la última hacia el borde superior → la lista se desplaza
   sola. Mover la última a la primera posición en < 5 s. (SC-001)
9. Colapsar el panel → no hay nada arrastrable.

## Verificación manual — modo con sesión

1. Iniciar sesión con Google. Las notas existentes se ven en el **mismo orden que antes
   del cambio**. (FR-011)
2. Reordenar → se ve el indicador de guardando y luego desaparece.
3. Abrir la app en otro navegador con la misma cuenta → mismo orden. (SC-006)
4. Crear una nota → aparece al final; recargar → sigue al final (ya no salta arriba).
5. Simular error: DevTools → Network → bloquear `PUT */notes/order` (o modo offline del
   navegador) y reordenar → aparece el mensaje de error y la lista vuelve al orden
   anterior; ninguna nota se pierde ni duplica. (FR-009, SC-005)
6. Mientras se guarda el contenido de una nota (indicador de guardado activo), intentar
   arrastrar → no se inicia el arrastre.

## Verificación manual — celular (Historia 3)

1. Deslizar rápido sobre la lista 20 veces → la lista scrollea y nunca se inicia un
   arrastre. (SC-003)
2. Mantener apretada una nota ~medio segundo → se levanta (visual + vibración en
   Android); no aparece el menú contextual ni se selecciona texto.
3. Moverla y soltar → queda en la nueva posición.
4. Repetir con la PWA instalada.
