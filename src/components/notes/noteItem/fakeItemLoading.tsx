import { Loader2 } from "lucide-react";
export const FakeItemLoading = () => {
  return (
    <div className="note-item-container loading">
      <p>Creando nota ...</p>
      <Loader2
        size={18}
        className="spinner-icon"
        style={{ marginRight: "10px" }}
      />
    </div>
  );
};
