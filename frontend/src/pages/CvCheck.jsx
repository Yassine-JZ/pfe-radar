import CvPanel from "../components/home/CvPanel";
import { useCvUpload } from "../hooks/useCvUpload";

export default function CvCheck() {
  const { status, cv, error, upload } = useCvUpload();
  return (
    <main style={{ maxWidth: 520, margin: "40px auto", padding: "0 16px" }}>
      <CvPanel
        status={status}
        cv={cv}
        error={error}
        onFile={upload}
        onAnalyze={(c) => console.log("Texte extrait :", c.text)}
      />
      {cv && (
        <details style={{ marginTop: 24 }}>
          <summary>Texte extrait ({cv.text.length} caractères)</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{cv.text}</pre>
        </details>
      )}
    </main>
  );
}