## 💡 Thinking Notes
Thinking Notes es una aplicación web minimalista y ultra-reactiva diseñada para capturar ideas rápidas de forma organizada. El proyecto pone un foco especial en la experiencia de usuario (UX) mediante animaciones fluidas, guardado inteligente y una interfaz limpia basada en componentes reutilizables.

 ```text
⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣶⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣦⣄⣀⡀⣠⣾⡇⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠿⢿⣿⣿⡇⠀⠀⠀⠀
⠀⣶⣿⣦⣜⣿⣿⣿⡟⠻⣿⣿⣿⣿⣿⣿⣿⡿⢿⡏⣴⣺⣦⣙⣿⣷⣄⠀⠀⠀
⠀⣯⡇⣻⣿⣿⣿⣿⣷⣾⣿⣬⣥⣭⣽⣿⣿⣧⣼⡇⣯⣇⣹⣿⣿⣿⣿⣧⠀⠀
⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠸⣿⣿⣿⣿⣿⣿⣿⣷
   ```

## ✨ Características Principales
Gestión de "Thinkings": Crea pensamientos dentro de cada nota. Cada uno es editable de forma independiente con auto-enfoque inteligente.

Dictado por voz: Un botón de micrófono junto al campo de nueva idea transcribe lo que decís (en español) mientras hablás. En la computadora funciona como interruptor (clic para empezar y clic para terminar); en el celular, se dicta mientras se mantiene presionado. Disponible en Chrome, Edge y Safari; en navegadores sin soporte el botón no aparece.

Reordenar notas: Arrastrá las notas del panel izquierdo para ordenarlas como quieras. En la computadora, hacé clic y arrastrá; en el celular, mantené apretada la nota medio segundo hasta que se levante y movela. El orden se guarda automáticamente, tanto sin cuenta (en el dispositivo) como con sesión iniciada (se sincroniza entre dispositivos).

Temas visuales: El botón de la paleta, al pie del panel izquierdo, permite elegir entre tres temas: Clásico (el azul de siempre), Oscuro (para escribir de noche) y Atardecer (cálido, en tonos durazno y terracota). Con el panel colapsado, en la computadora el botón aparece dentro de la cápsula; en el celular, se usa desde el panel expandido. El tema elegido se guarda en el navegador, con o sin sesión iniciada.

Fechas de la nota: El botón de información junto al buscador muestra cuándo se creó la nota y cuándo se modificó por última vez. Las notas creadas sin cuenta antes de esta versión no tienen fecha registrada.

Persistencia Inteligente (Debounce): Las notas se guardan automáticamente en localStorage. El sistema espera 5 segundos de inactividad antes de escribir en disco para optimizar el rendimiento.

Interfaz Dinámica:

Sidebar Colapsable: Animación de rebote (bounce) al aparecer y estados colapsados para maximizar el área de trabajo.

Indicador de Guardado: Iconos dinámicos que muestran en tiempo real si tus cambios están pendientes de guardado o ya están seguros.

Arte ASCII Personalizado: Una pantalla de bienvenida visualmente atractiva cuando no hay notas seleccionadas.

UX Refinada: \* Doble clic para activar notas.

Prevención de mutación directa de estado mediante copias profundas e inmutabilidad.

Control de cursor automático al final del texto en ediciones.

## 🛠️ Stack Tecnológico
Core: React 18 + TypeScript

Estado Global: Context API (NotesProvider)

Iconografía: Lucide React

Build Tool: Vite

Estilos: CSS3 nativo con variables personalizadas y Keyframe Animations.

## 📂 Estructura del Proyecto

 ```text
src/
├── components/
│ ├── notes/ # Componentes de contenido y items de nota
│ └── sidebar/ # Navegación y acciones globales
├── context/ # Lógica de estado global (NotesContext)
├── hooks/ # Hooks personalizados (useDebounce, etc.)
├── types/ # Definiciones de interfaces TypeScript
└── App.tsx # Punto de entrada principal
```
## 🚀 Instalación y Desarrollo
Clonar el repositorio:

Bash
git clone https://github.com/LautaroJSON/thinking-notes.git
cd thinking-notes
Instalar dependencias:

Bash
npm install
Ejecutar en modo desarrollo:

Bash
npm run dev
Construir para producción:

Bash
npm run build

## 🌐 Despliegue
La app se publica en Vercel: https://thinking-notes.vercel.app/

Cada push a `main` despliega automáticamente. Las variables de entorno
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`) se configuran
en el proyecto de Vercel. GitHub Actions corre los tests y el build en cada push y
Pull Request.
