# Quickstart: validar los sonidos de interacción

## Preparación

```bash
npm install
npm test
npm run build
npm run dev
```

Abrir `http://localhost:5174` con el volumen del equipo a nivel normal. Para empezar de cero, borrar la clave `sounds` de `localStorage` (DevTools → Application → Local Storage).

## Pruebas automáticas (Vitest)

`npm test` debe cubrir:

- `sounds.test.ts`: defaults en computadora (todo encendido) y táctil (Escritura apagada); lectura con JSON inválido, tipos incorrectos, claves desconocidas y `localStorage` que lanza; guardado de solo overrides (y borrado de la clave si no hay); `isSoundAllowed` con general apagado o categoría apagada; `soundForInputType` para cada `inputType` (texto, borrar, Enter, pegar, IME, desconocido).
- `useSounds.test.ts`: cambiar general/categoría notifica y persiste; apagar y volver a encender el general restaura las categorías; evento `storage` de otra pestaña actualiza el estado; `play` no llama al motor si no está permitido.
- `soundEngine` (con `AudioContext` falso): sin soporte no lanza; pestaña oculta no reproduce; límite de 35 ms en escritura y de 6 voces.
- `notesContext.test.tsx`: crear y borrar nota reproducen `create`/`remove` solo en éxito (online y offline) y nunca cuando la API falla.

## Verificación manual (computadora)

| # | Pasos | Resultado esperado |
|---|-------|--------------------|
| 1 | Cargar la app sin tocar nada. | No suena nada. |
| 2 | Seleccionar una nota de la lista. | Toque breve de madera. |
| 3 | Crear nota, agregar una idea, borrar la idea, borrar la nota. | Cada acción suena una vez; crear ascendente, borrar descendente. |
| 4 | Escribir un párrafo rápido en el cuadro de ideas, en el título y en la búsqueda. | Sonido casi imperceptible por tecla, con leve variación; el texto aparece sin retraso. |
| 5 | Mantener apretada una letra 3 s. | Sin ráfaga molesta ni subida de volumen. |
| 6 | Shift, Ctrl, flechas, Ctrl+C. | No suenan. |
| 7 | Pegar un párrafo; pegar una imagen. | Un único sonido de pegado en cada caso. |
| 8 | Dictar una frase. | Suena al empezar y al terminar; el texto dictado no suena como teclas. |
| 9 | Copiar la nota; descargarla; reordenar una nota arrastrando. | Suena una vez cada uno. |
| 10 | Abrir/cerrar los menús de temas, descarga, info y sonido; cambiar de tema. | Toque de selección / cierre. |
| 10b | Colapsar y expandir el panel lateral. | Un "deslizar" suave que baja al colapsar y sube al expandir. |
| 11 | En el menú de sonido, apagar "Escritura". | Escribir no suena; selección y acciones sí. Al volver a encenderla suena una muestra. |
| 12 | Apagar "Sonidos" (general). | Nada suena; el ícono muestra el parlante tachado. Al encender, vuelven las categorías como estaban. |
| 13 | Recargar con la configuración del paso 11; repetir con sesión iniciada; iniciar y cerrar sesión. | La configuración se mantiene igual. |
| 14 | Colapsar el panel y volver a expandirlo. | La cápsula colapsada se ve igual que antes; al expandir, el parlante está junto a la paleta y su menú abre hacia arriba sin recortarse. |
| 15 | Usar el menú solo con teclado (Tab, flechas, Espacio, Escape) y con lector de pantalla. | Se anuncian nombre y estado de cada interruptor. |
| 16 | Cambiar de pestaña mientras se reordena o se crea una nota online. | No suena con la pestaña oculta. |
| 17 | Desconectar la red (DevTools → Offline) y repetir 2–4. | Suena igual. |
| 18 | Simular falla de la API al borrar (DevTools → bloquear la URL del servicio). | No suena el sonido de borrar; aparece el comportamiento de error de siempre. |
| 19 | Comparar el tiempo de carga con `main` (Lighthouse o pestaña Performance). | Sin diferencia perceptible. |

## Verificación manual (celular, 360 px)

| # | Pasos | Resultado esperado |
|---|-------|--------------------|
| 20 | Abrir la app por primera vez (sin clave `sounds`). | Escritura apagada; Selección y Acciones suenan. |
| 21 | Encender Escritura, recargar. | Queda encendida en ese dispositivo. |
| 22 | iPhone con el interruptor de silencio activado. | No suena (iOS 17+). |
| 23 | PWA instalada: actualizar a la nueva versión. | Instala/actualiza normalmente. |

## Escucha de carácter (SC-006)

Escuchar todos los sonidos seguidos con el volumen normal: deben sentirse de la misma familia, ninguno estridente; escribir 5 minutos seguidos y confirmar que el de escritura pasa casi desapercibido.
