# Quickstart: validar el selector de temas

**Feature**: [spec.md](./spec.md) | **Contratos**: [contracts/](./contracts/)

## Requisitos

- Dependencias instaladas (`npm install`) y `.env.local` con las variables `VITE_*` para
  probar el modo con sesión.
- Un navegador de escritorio y un celular (o el modo dispositivo de DevTools a 360 px).

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

Se espera: tests de `theme.test.ts` y `useTheme.test.ts` en verde (valores válidos,
inválidos, almacenamiento que falla, `classic` borra la clave, `applyTheme` actualiza
`data-theme` y la meta, evento `storage` de otra pestaña, coincidencia entre
`index.html` y `theme.ts`); build sin errores; lint sin errores nuevos en los archivos
tocados.

## Verificación manual

Levantar la app con `npm run dev` (puerto 5174).

### 1. Elegir tema (US1)

1. Sin haber elegido nunca un tema (borrar la clave `theme` en DevTools › Application),
   la app se ve **igual que en `main`** (comparar capturas: fondo, panel, notas,
   cuadro de texto, botones).
2. Presionar el botón de paleta al pie del panel: se abre hacia arriba un menú con
   Clásico (marcado), Oscuro y Atardecer, cada uno con su muestra.
3. Elegir **Oscuro**: toda la interfaz cambia al instante y el menú se cierra.
   Recorrer: panel, lista de notas (normal, activa, arrastrando), contenido de la nota,
   cuadro de texto (vacío/placeholder, con foco), indicador pendiente/guardado, menú de
   descarga, búsqueda con resaltado, dictado grabando, modal de perfil, número de
   versión, barras de desplazamiento. Ningún elemento debe quedar con colores del
   Clásico ni con texto ilegible.
4. Repetir con **Atardecer**.
5. Con texto a medio escribir en una nota, cambiar de tema: el texto y el estado de
   guardado no cambian.
6. Cerrar el menú con clic afuera, con Escape y volviendo a tocar el botón: no cambia el
   tema.
7. Solo teclado: Tab hasta el botón, Enter, flechas, Enter. El foco vuelve al botón.

### 2. Persistencia (US2)

1. Sin sesión: elegir Atardecer y recargar → abre en Atardecer **sin destello** del
   Clásico (probar también con DevTools › Network › "Slow 4G" y caché deshabilitada).
2. Iniciar sesión con Google → el tema sigue siendo Atardecer. Recargar → igual.
3. Cerrar sesión → el tema se mantiene.
4. Escribir a mano `localStorage.theme = "rosa"` y recargar → abre en Clásico, sin
   errores en consola.
5. En una ventana privada con almacenamiento bloqueado (o simulando que `setItem` lanza),
   cambiar de tema funciona en la sesión; al recargar vuelve a Clásico, sin errores
   visibles.
6. Con dos pestañas abiertas, cambiar el tema en una → la otra lo adopta (en vivo o al
   recargar).

### 3. Celular (US3)

1. A 360 px de ancho, con el panel expandido: el botón está al pie, el menú se ve
   completo y no hay scroll horizontal.
2. Con el panel colapsado: el botón aparece dentro de la cápsula y el menú se abre hacia
   la derecha sin cortarse.
3. Con la PWA instalada (o Chrome Android), elegir Oscuro → la barra del navegador toma
   el color oscuro.
4. Verificar que la PWA se sigue instalando y actualizando (DevTools › Application ›
   Service Workers sin errores).

### 4. Contraste (FR-012, SC-005)

Con el inspector de color de DevTools, en cada tema:

- `--text` y `--text-muted` sobre `--surface` ≥ 4.5:1.
- íconos sobre `--primary-color` ≥ 3:1.
- estados guardado/error/grabando distinguibles entre sí.

Con `prefers-reduced-motion: reduce` emulado, el cambio de tema es inmediato sin
transición.
