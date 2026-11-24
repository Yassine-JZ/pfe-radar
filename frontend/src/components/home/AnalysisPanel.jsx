import "./AnalysisPanel.css";

const STATE_TEXT = { done: "Terminé", running: "En cours…", error: "Erreur", wait: "En attente" };

function Step({ label, state }) {
  return (
    <li className={`anp-step is-${state}`}>
      <span>{label}</span>
      <span className="anp-step-state">{STATE_TEXT[state]}</span>
    </li>
  );
}

export default function AnalysisPanel({
  cvLoaded,
  status,
  skills,
  domains,
  catalog,
  error,
  onAdd,
  onRemove,
}) {
  const selected = new Set(skills.map((s) => s.name));
  const addable = catalog.filter((s) => !selected.has(s.name));
  const detectState =
    status === "done" ? "done" : status === "running" ? "running" : status === "error" ? "error" : "wait";

  return (
    <section className="anp">
      <h2 className="anp-title">
        <span className="anp-badge">02</span> Analyse
      </h2>

      <ul className="anp-steps">
        <Step label="Extraction du texte" state={cvLoaded ? "done" : "wait"} />
        <Step label="Détection des compétences" state={detectState} />
        <Step label="Comparaison avec les offres" state="wait" />
      </ul>

      {status === "idle" && (
        <p className="anp-hint">Charge ton CV puis lance l'analyse pour voir tes compétences.</p>
      )}
      {status === "error" && (
        <p className="anp-error" role="alert">
          {error}
        </p>
      )}

      {status === "done" && (
        <>
          <h3 className="anp-sub">Compétences détectées</h3>
          {skills.length === 0 && (
            <p className="anp-hint">Aucune compétence détectée : ajoute-les manuellement ci-dessous.</p>
          )}
          <div className="anp-chips">
            {skills.map((s) => (
              <span key={s.name} className="anp-chip">
                {s.name}
                <button
                  type="button"
                  aria-label={`Retirer ${s.name}`}
                  onClick={() => onRemove(s.name)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <select
            className="anp-select"
            value=""
            onChange={(e) => e.target.value && onAdd(e.target.value)}
          >
            <option value="">Ajouter une compétence…</option>
            {addable.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.domain})
              </option>
            ))}
          </select>

          <h3 className="anp-sub">Profil par domaine</h3>
          <ul className="anp-domains">
            {domains.map((d) => (
              <li key={d.domain}>
                <div className="anp-domain-row">
                  <span>{d.domain}</span>
                  <strong>{d.score}%</strong>
                </div>
                <div className="anp-bar">
                  <div style={{ width: `${d.score}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}