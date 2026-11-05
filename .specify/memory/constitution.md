<!--
Sync Impact Report
- Versión: 1.0.0 → 1.1.0 (MINOR: cambio material en "Restricciones Técnicas")
- Secciones modificadas:
  - Restricciones Técnicas › Despliegue: GitHub Pages → Vercel.
  - Restricciones Técnicas › Rutas y assets: la base pasa de "/thinking-notes/" a "/".
  - Flujo de Desarrollo y Calidad › Gates: `npm test` corre en el workflow de CI (ya no
    hay workflow de deploy en GitHub Actions).
- Principios: sin cambios.
- Plantillas dependientes: sin cambios necesarios.
- TODOs diferidos: los de 1.0.0 (README dice React 18).

Historial — 1.0.0:
- Versión: (plantilla sin completar) → 1.0.0
- Principios definidos (nuevos):
  I. Paridad Offline/Online (NO NEGOCIABLE)
  II. Experiencia Minimalista y Fluida
  III. Tests para la Lógica
  IV. TypeScript Estricto
  V. Stack Estable, Dependencias por Mérito
- Secciones agregadas: Restricciones Técnicas, Flujo de Desarrollo y Calidad, Gobernanza
- Secciones eliminadas: ninguna
- Plantillas dependientes: plan/spec/tasks leen esta constitución en tiempo de ejecución;
  no requieren cambios.
- TODOs diferidos:
  - `npm run lint` tiene deuda previa (13 problemas al 2026-11-05); ver "Flujo de Desarrollo".
  - README desactualizado (dice React 18; el proyecto usa React 19).
-->

# Constitución de Thinking Notes

Thinking Notes es una aplicación web (PWA) minimalista para capturar ideas rápidas
organizadas en notas y "thinkings". Funciona sin cuenta (localStorage) y, con login de
Google vía Supabase, sincroniza las notas con una API remota.

## Principios Fundamentales

### I. Paridad Offline/Online (NO NEGOCIABLE)

- Toda funcionalidad DEBE funcionar en ambos modos: sin sesión (persistencia en
  `localStorage`) y con sesión (persistencia remota vía la capa de servicios).
- El modo offline NUNCA DEBE depender del login, de la red ni de la API remota.
- Si la API remota falla, la app DEBE degradar a un estado usable (por ejemplo, datos
  locales) y no perder lo que el usuario escribió.
- Una funcionalidad que solo tenga sentido con sesión (por ejemplo, el perfil) DEBE
  justificarse explícitamente en la spec y no debe bloquear el flujo offline.
- Cada spec y plan DEBEN describir el comportamiento en los dos modos.

**Razón**: poder usar la app sin cuenta es parte de la propuesta de valor; la sesión
suma sincronización, no es un requisito para usarla.

### II. Experiencia Minimalista y Fluida

- La interfaz DEBE mantenerse limpia y centrada en escribir: nada de pasos,
  confirmaciones ni pantallas que no aporten al flujo de captura de ideas.
- El guardado DEBE ser automático y el usuario DEBE ver en todo momento si sus cambios
  están pendientes o guardados.
- Las operaciones asíncronas (cargar, crear, editar, borrar) DEBEN mostrar un estado de
  carga y manejar el error de forma visible o recuperable; nunca fallar en silencio
  dejando la UI inconsistente.
- Las animaciones DEBEN ser sutiles y no bloquear la interacción.
- La interfaz DEBE ser usable en pantallas de celular (PWA instalable).
- Los textos de la interfaz están en español.

**Razón**: el diferencial del producto es la sensación de rapidez y simpleza al
anotar.

### III. Tests para la Lógica

- La lógica nueva o modificada (hooks, servicios, contexto, utilidades) DEBE tener
  tests automatizados con Vitest, cubriendo como mínimo el caso feliz, los errores y
  ambos modos (offline/online) cuando aplique.
- Los componentes visuales PUEDEN verificarse de forma manual; la spec o las tareas
  DEBEN indicar los pasos de verificación manual.
- Un bug corregido en lógica DEBE venir con un test que lo reproduzca.
- No es obligatorio agregar tests al código existente que no se toca; sí al que se
  modifica.

**Razón**: la lógica de persistencia y sincronización es donde un error hace perder
notas; ahí los tests rinden más.

### IV. TypeScript Estricto

- El modo `strict` de TypeScript DEBE mantenerse activado.
- El código nuevo NO DEBE usar `any`; usar tipos concretos, `unknown` con validación o
  genéricos.
- Las formas de datos compartidas (notas, respuestas de la API, estados) DEBEN
  declararse en `src/types` o junto al servicio que las define, y las conversiones entre
  el formato remoto y el local DEBEN ser explícitas.
- Las variables de entorno DEBEN leerse vía `import.meta.env` y validarse donde se usan.

**Razón**: el tipado estricto atrapa errores de forma de datos entre los dos modos de
persistencia antes de llegar al usuario.

### V. Stack Estable, Dependencias por Mérito

- El stack base es React + TypeScript + Vite, estado global con Context API, estilos
  con CSS nativo por componente e iconos de Lucide.
- Por defecto, cada funcionalidad DEBE resolverse con el stack existente.
- Se PUEDE proponer una librería nueva cuando sea el camino más óptimo (menos código,
  mejor rendimiento, más robustez o mejor mantenibilidad). El plan DEBE justificarla:
  qué problema resuelve, qué alternativa con el stack actual se descartó y su costo
  (tamaño del bundle, mantenimiento).
- NO se agregan librerías por moda ni por preferencia sin una ventaja concreta.

**Razón**: un stack chico mantiene la app liviana y fácil de mantener, sin cerrarse a
mejoras reales.

## Restricciones Técnicas

- **Despliegue**: Vercel en `https://thinking-notes.vercel.app/`, desplegado
  automáticamente en cada push a `main`. Las variables `VITE_*` se configuran en el
  proyecto de Vercel. GitHub Pages NO se usa.
- **Rutas y assets**: Vite usa `base: "/"`. Las rutas internas DEBERÍAN construirse con
  `import.meta.env.BASE_URL` o imports de Vite, para no depender de dónde se sirve la
  app.
- **Capa de red**: toda llamada a la API remota DEBE pasar por `src/services`; los
  componentes no hacen `fetch` directo. La autenticación se hace solo con el cliente de
  Supabase (`lib/supabaseClient`).
- **Secretos**: el frontend solo puede contener valores públicos (`VITE_*`, como la
  anon key de Supabase). Ningún secreto de servidor DEBE llegar al bundle ni al repo;
  los valores de build viven en los secrets de GitHub Actions y en `.env.local`.
- **PWA**: los cambios NO DEBEN romper la instalación ni la actualización automática
  del service worker.

## Flujo de Desarrollo y Calidad

- **Ramas**: el trabajo se hace en ramas `feat/...` o `fix/...` y entra a `main` por
  Pull Request.
- **Commits**: formato Conventional Commits en español (`feat:`, `fix:`, `ci:`,
  `docs:`, `refactor:`, `test:`).
- **Gates antes de mergear** (`npm test` y `npm run build` también corren en el workflow de CI):
  - `npm run build` DEBE pasar.
  - Los tests de Vitest DEBEN pasar.
  - `npm run lint` NO DEBE sumar errores nuevos respecto de `main`. La deuda de lint
    existente (13 problemas al 2026-11-05) se reduce de forma incremental: el archivo
    que se toca DEBERÍA quedar sin errores de lint.
  - La verificación manual de la UI indicada en la spec DEBE hacerse en ambos modos.
- **Idioma de la documentación**: constitución, specs, planes y tareas se escriben en
  español.
- **SDD**: las funcionalidades no triviales siguen el flujo de Spec Kit
  (specify → plan → tasks → implement); cada plan DEBE incluir el chequeo contra esta
  constitución.

## Gobernanza

- Esta constitución prevalece sobre cualquier otra práctica o convención del proyecto.
  Ante un conflicto, se cumple la constitución o se la enmienda primero.
- Las enmiendas se hacen con `/speckit-constitution`, quedan registradas en el Sync
  Impact Report y se commitean como `docs: amend constitution to vX.Y.Z (...)`.
- Versionado semántico:
  - MAJOR: se elimina o redefine un principio de forma incompatible.
  - MINOR: se agrega un principio o sección, o se amplía de forma material.
  - PATCH: aclaraciones y redacción sin cambio de significado.
- Cada plan (`/speckit-plan`) y revisión de PR DEBE verificar el cumplimiento. Toda
  excepción a un principio DEBE quedar justificada por escrito en el plan
  (sección de complejidad/excepciones).

**Version**: 1.1.0 | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
