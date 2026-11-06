import "./App.css";
import AppVersion from "./components/appVersion";
import NoteContent from "./components/notes/noteContent";
import Sidebar from "./components/sidebar";
import useTypingSounds from "./hooks/useTypingSounds";

function App() {
  useTypingSounds();

  return (
    <div className="main-container">
      <Sidebar />
      <NoteContent />
      <AppVersion />
    </div>
  );
}

export default App;
