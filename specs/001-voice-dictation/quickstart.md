# Quickstart: validar el dictado por voz

**Feature**: [spec.md](./spec.md) | **Contratos**: [hook](./contracts/use-speech-dictation.md), [UI](./contracts/dictation-button-ui.md)

## Prerrequisitos

- `npm install` hecho.
- Navegadores para probar: Chrome o Edge de escritorio con micrófono; Chrome en Android; Safari en iOS (en el navegador y como PWA instalada); Firefox (solo para comprobar que el botón se oculta).
- Para probar en el celular contra el dev server hace falta HTTPS, o usar la build publicada en GitHub Pages. `localhost` solo cuenta como contexto seguro en la misma máquina.

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

Esperado: tests en verde (incluye los casos C1–C13 y U1–U10 de los contratos), build OK, y que lint no sume errores nuevos (los archivos tocados quedan sin errores).

## Verificación manual

Cada paso se hace **dos veces: sin sesión y con sesión de Google** (Principio I / SC-005).

```bash
npm run dev
```

| Paso | Dispositivo | Acción | Resultado esperado |
|---|---|---|---|
| M1 | Escritorio (Chrome) | Abrir una nota y hacer clic en el micrófono; aceptar el permiso; decir "esto es una prueba" | Botón en estado activo; el texto aparece mientras hablás (US1-1, US1-2) |
| M2 | Escritorio | Quedarse callado 20 s y seguir hablando | El botón sigue activo y el texto nuevo se agrega (clarificación Q1) |
| M3 | Escritorio | Clic de nuevo | El botón vuelve a inactivo y el texto queda editable (US1-3) |
| M4 | Escritorio | Escribir "hola" a mano y después dictar "mundo" | "hola mundo" (US1-4) |
| M5 | Escritorio | Enter | Se agrega como idea, el indicador de guardado pasa de cargando a check (US1-5) |
| M6 | Escritorio | Mientras dictás, apretar Enter y seguir hablando | La idea se agrega y lo nuevo arranca vacío, sin duplicados (edge case) |
| M7 | Escritorio | Tab hasta el micrófono, Enter/Espacio | Toggle por teclado; un lector de pantalla anuncia "Dictar por voz, presionado/no presionado" (FR-008) |
| M8 | iOS Safari y PWA instalada | Mantener presionado y hablar | Funciona, o muestra "El dictado no está disponible en este navegador" y el campo sigue usable (research R9) |
| M9 | Android Chrome | Mantener presionado, hablar y soltar | El texto aparece mientras mantenés; al soltar se detiene y queda el texto (US2-1, US2-2) |
| M10 | Celular | Mantener presionado, deslizar el dedo fuera del botón | Se detiene y conserva el texto (US2-3) |
| M11 | Celular | Toque corto | No queda escuchando; aparece "Mantené presionado para dictar" (US2-4) |
| M12 | Celular | Mantener presionado 3 s | No aparece menú contextual, selección ni zoom (FR-014) |
| M13 | Cualquiera | Denegar el permiso del micrófono e intentar dictar | "Habilitá el permiso del micrófono para dictar."; el botón vuelve a inactivo (US3-2) |
| M14 | Escritorio | Dictar y, sin parar, cambiar a otra nota | El dictado se corta y no aparece texto en la otra nota (FR-011) |
| M15 | Escritorio | Dictar y cambiar de pestaña | El dictado se corta (FR-011) |
| M16 | Escritorio | Desconectar internet (DevTools → Offline) y dictar | "El dictado necesita conexión a internet."; escribir a mano y guardar sigue funcionando |
| M17 | Firefox | Abrir una nota | No hay botón de micrófono; todo lo demás igual (US3-1) |
| M18 | Escritorio | Con el buscador abierto, dictar | El texto va al campo de nueva idea, no al buscador |
