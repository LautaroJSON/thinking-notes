import "./styles.css";
import { useNotes } from "@/context/notesContext";
import { LoaderCircle, Check, Pencil, Trash2 } from "lucide-react";
import { useState, useRef } from "react";

const NoteContent = () => {
  const {
    getActiveNote,
    notes,
    setNotes,
    activeNoteID,
    loadingSaveLocalStorage,
  } = useNotes();
  const [isHoveredID, setIsHoveredID] = useState<number>(-1);
  const [isEditingID, setIsEditingID] = useState<number>(-1);

  const asciiArt = `
⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣶⣄⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣦⣄⣀⡀⣠⣾⡇⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀⠀
⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠿⢿⣿⣿⡇⠀⠀⠀⠀
⠀⣶⣿⣦⣜⣿⣿⣿⡟⠻⣿⣿⣿⣿⣿⣿⣿⡿⢿⡏⣴⣺⣦⣙⣿⣷⣄⠀⠀⠀
⠀⣯⡇⣻⣿⣿⣿⣿⣷⣾⣿⣬⣥⣭⣽⣿⣿⣧⣼⡇⣯⣇⣹⣿⣿⣿⣿⣧⠀⠀
⠀⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠸⣿⣿⣿⣿⣿⣿⣿⣷
  `;

  const [newThinking, setNewThinking] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const note = getActiveNote();

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activeNoteID !== null) {
      const updatedNotes = [...notes];
      updatedNotes[activeNoteID] = {
        ...updatedNotes[activeNoteID],
        title: e.target.value,
      };
      setNotes(updatedNotes);
    }
  };

  const handleAddThinking = () => {
    if (newThinking.trim() && activeNoteID !== null) {
      const updatedNotes = [...notes];
      updatedNotes[activeNoteID].thinkings.push(newThinking);
      setNotes(updatedNotes);
      setNewThinking("");

      // Auto-focus en el nuevo textarea
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 0);
    }
  };

  const handleDeleteThinking = (thinkingIndex: number) => {
    if (activeNoteID !== null) {
      // 1. Copiamos el array de notas (shallow copy)
      const updatedNotes = [...notes];

      // 2. Creamos una copia del objeto de la nota activa para no mutarlo
      const noteToUpdate = { ...updatedNotes[activeNoteID] };

      // 3. Creamos un nuevo array de thinkings EXCLUYENDO el que queremos borrar
      // .filter() devuelve un array nuevo, así que no muta el original
      const updatedThinkings = noteToUpdate.thinkings.filter(
        (_, index) => index !== thinkingIndex,
      );

      // 4. Asignamos el nuevo array a nuestra copia de la nota
      noteToUpdate.thinkings = updatedThinkings;

      // 5. Actualizamos el array de notas con la nota ya modificada
      updatedNotes[activeNoteID] = noteToUpdate;

      // 6. Seteamos el estado global
      setNotes(updatedNotes);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddThinking();
    }
  };

  return (
    <div className="note-c-container">
      {note ? (
        <>
          <div className="title">
            <input
              type="text"
              value={note?.title || ""}
              onChange={handleTitleChange}
              placeholder="Sin título"
              className="title-input"
            />
            <div className="save-indicator">
              {loadingSaveLocalStorage ? (
                <LoaderCircle size={20} className="loading-icon" />
              ) : (
                <Check size={20} className="check-icon" />
              )}
            </div>
          </div>
          <div className="thinking-list">
            {note?.thinkings.map((thinking, index) => (
              <div
                key={index}
                onMouseEnter={() => setIsHoveredID(index)}
                onMouseLeave={() => setIsHoveredID(-1)}
                className="thinking-text-container"
              >
                {isEditingID === index ? (
                  <textarea
                    className="thinking-input"
                    defaultValue={thinking}
                    autoFocus
                    ref={(el) => {
                      if (el) {
                        const length = el.value.length;
                        el.setSelectionRange(length, length);
                      }
                    }}
                    onBlur={(e) => {
                      if (activeNoteID !== null) {
                        const updatedNotes = [...notes];
                        updatedNotes[activeNoteID] = {
                          ...updatedNotes[activeNoteID],
                          thinkings: updatedNotes[activeNoteID].thinkings.map(
                            (t, i) => (i === index ? e.target.value : t),
                          ),
                        };
                        setNotes(updatedNotes);
                      }
                      setIsEditingID(-1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                  />
                ) : (
                  <span key={index} className="thinking-text">
                    {thinking}
                  </span>
                )}
                {isHoveredID === index && (
                  <div className="thinking-actions">
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsEditingID((prev) => (prev === index ? -1 : index));
                      }}
                      className="action-btn edit"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteThinking(index)}
                      className="action-btn delete"
                      title="Borrar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            <textarea
              ref={textAreaRef}
              value={newThinking}
              onChange={(e) => setNewThinking(e.target.value)}
              onBlur={handleAddThinking}
              onKeyDown={handleKeyDown}
              placeholder="Comienza a escribir tus ideas aqui :)"
              className="thinking-input"
            />
          </div>
        </>
      ) : (
        <div className="no-active-note">
          Selecciona o crea una nota para comenzar <br />
          <pre className="ascii-art">{asciiArt}</pre>
        </div>
      )}
    </div>
  );
};

export default NoteContent;
