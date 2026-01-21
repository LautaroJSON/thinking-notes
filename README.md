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
