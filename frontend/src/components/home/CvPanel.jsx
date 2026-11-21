import { useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import "./CvPanel.css";

const SECTIONS = [
  ["competences", "Compétences"],
  ["experience", "Expériences"],
  ["formation", "Formation"],
];

function formatSize(bytes) {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function shorten(text, max = 160) {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function CvPanel({ status, cv, error, onFile, onAnalyze, analyzing = false }) {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <section className="cvp">
      <h2 className="cvp-title">
        <span className="cvp-badge">01</span> Mon CV
      </h2>

      <div
        className={`cvp-drop${dragging ? " is-drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <p className="cvp-hint">Glisse ton CV (PDF)</p>
        <button
          type="button"
          className="cvp-btn-outline"
          disabled={status === "uploading"}
          onClick={() => inputRef.current?.click()}
        >
          Choisir un fichier
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {status === "idle" && <p className="cvp-hint">Aucun CV chargé pour l'instant.</p>}
      {status === "uploading" && (
        <p className="cvp-info" role="status">
          Lecture du PDF…
        </p>
      )}
      {status === "error" && (
        <p className="cvp-error" role="alert">
          {error}
        </p>
      )}

      {status === "done" && cv && (
        <div className="cvp-card">
          <div className="cvp-file">
            <span className="cvp-pdf">PDF</span>
            <div>
              <strong>{cv.filename}</strong>
              <div className="cvp-hint">{formatSize(cv.size)} · chargé</div>
            </div>
          </div>
          <dl className="cvp-fields">
            <div>
              <dt>Nom</dt>
              <dd>{user?.full_name}</dd>
            </div>
            <div>
              <dt>Niveau</dt>
              <dd>{cv.level ?? "Non détecté"}</dd>
            </div>
            {SECTIONS.map(([key, label]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{shorten(cv.sections?.[key]) ?? "Non détecté"}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <button
        type="button"
        className="cvp-btn"
        disabled={status !== "done" || analyzing}
        onClick={() => onAnalyze?.(cv)}
      >
        {analyzing ? "Analyse en cours…" : "Lancer l'analyse"}
      </button>
    </section>
  );
}