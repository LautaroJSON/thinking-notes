// Esqueleto que se muestra mientras se cargan las notas: tarjetas con la
// misma forma que NoteItem y un brillo que las recorre. Con `leaving`, se
// superpone a la lista y se desvanece mientras entran las notas reales.
const TITLE_WIDTHS = ["72%", "55%", "80%", "48%", "65%", "58%"];

export const NotesSkeleton = ({ leaving = false }: { leaving?: boolean }) => {
  return (
    <div
      className={`notes-skeleton${leaving ? " leaving" : ""}`}
      role={leaving ? undefined : "status"}
      aria-label={leaving ? undefined : "Cargando notas"}
      aria-hidden={leaving || undefined}
    >
      {TITLE_WIDTHS.map((width, i) => (
        <div
          key={i}
          className="note-item-container note-skeleton"
          style={{ animationDelay: `${i * 70}ms` }}
          aria-hidden="true"
        >
          <span className="note-skeleton-line" style={{ width }} />
        </div>
      ))}
    </div>
  );
};
