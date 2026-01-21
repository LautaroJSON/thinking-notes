import "./App.css";
import NoteContent from "./components/notes/noteContent";
import Sidebar from "./components/sidebar";

function App() {
  return (
    <div className="main-container">
      <Sidebar />
      <NoteContent />
    </div>
  );
}

export default App;
