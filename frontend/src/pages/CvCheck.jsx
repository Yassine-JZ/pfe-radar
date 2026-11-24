import AnalysisPanel from "../components/home/AnalysisPanel";
import CvPanel from "../components/home/CvPanel";
import { useAnalysis } from "../hooks/useAnalysis";
import { useCvUpload } from "../hooks/useCvUpload";

export default function CvCheck() {
  const cvUpload = useCvUpload();
  const analysis = useAnalysis();

  return (
    <main
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1.4fr)",
        gap: 32,
        maxWidth: 1100,
        margin: "40px auto",
        padding: "0 16px",
      }}
    >
      <CvPanel
        status={cvUpload.status}
        cv={cvUpload.cv}
        error={cvUpload.error}
        onFile={(file) => {
          analysis.reset();
          cvUpload.upload(file);
        }}
        onAnalyze={(cv) => analysis.run(cv.text)}
        analyzing={analysis.status === "running"}
      />
      <AnalysisPanel
        cvLoaded={cvUpload.status === "done"}
        status={analysis.status}
        skills={analysis.skills}
        domains={analysis.domains}
        catalog={analysis.catalog}
        error={analysis.error}
        onAdd={analysis.addSkill}
        onRemove={analysis.removeSkill}
      />
    </main>
  );
}