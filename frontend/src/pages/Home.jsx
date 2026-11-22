import { useRef, useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { useAnalysis } from "../hooks/useAnalysis";
import { useCvUpload } from "../hooks/useCvUpload";

const STEP_LABELS = [
  "Extraction du texte",
  "Détection des compétences",
  "Comparaison avec les offres",
];

const STATE_TEXT = {
  waiting: "En attente",
  running: "En cours…",
  done: "Terminé",
  error: "Erreur",
};

// Correspondance entre l'état d'un hook et l'état affiché d'une étape.
const UPLOAD_TO_STEP = { idle: "waiting", uploading: "running", done: "done", error: "error" };
const ANALYSIS_TO_STEP = { idle: "waiting", running: "running", done: "done", error: "error" };

// Ordre des domaines autour des radars (le backend les renvoie dans un autre ordre).
const DOMAIN_ORDER = ["Data", "Web", "DevOps", "Mobile", "IA / ML"];

// ---------------------------------------------------------------------------
// Zone 3 (Résultats) : données de démonstration, encore statiques.
// Elles seront remplacées par le matching réel à l'étape suivante.
// ---------------------------------------------------------------------------
// logo: URL du logo de la société (null = initiales affichées à la place)
// address: sert à ouvrir la position exacte sur Google Maps
const OFFERS = [
  {
    id: "a",
    title: "Data Analyst – PFE",
    company: "Société A",
    city: "Tunis",
    domain: "Data",
    score: 87,
    logo: null,
    address: "Technopark El Ghazala, Ariana, Tunisie",
    missing: ["Power BI"],
  },
  {
    id: "d",
    title: "Data Engineer – PFE",
    company: "Société D",
    city: "Sousse",
    domain: "Data",
    score: 81,
    logo: null,
    address: "Technopole de Sousse, Tunisie",
    missing: ["Spark", "Airflow"],
  },
  {
    id: "e",
    title: "Développeur Web – PFE",
    company: "Société E",
    city: "Sfax",
    domain: "Web",
    score: 79,
    logo: null,
    address: "Sfax Technopark, Tunisie",
    missing: ["TypeScript"],
  },
  {
    id: "b",
    title: "Full-Stack – PFE",
    company: "Société B",
    city: "Nabeul",
    domain: "Web",
    score: 72,
    logo: null,
    address: "Nabeul, Tunisie",
    missing: ["TypeScript", "Node.js"],
  },
  {
    id: "f",
    title: "Ingénieur DevOps – PFE",
    company: "Société F",
    city: "Tunis",
    domain: "DevOps",
    score: 64,
    logo: null,
    address: "Les Berges du Lac, Tunis, Tunisie",
    missing: ["Kubernetes", "CI/CD"],
  },
  {
    id: "c",
    title: "Ingénieur MLOps – PFE",
    company: "Société C",
    city: "Tunis",
    domain: "IA / ML",
    score: 58,
    logo: null,
    address: "Centre Urbain Nord, Tunis, Tunisie",
    missing: ["TensorFlow", "MLflow"],
  },
];

// ---------------------------------------------------------------------------
// Géométrie du radar de matching
// Centre = le profil de l'étudiant. Plus le score est élevé, plus l'offre est
// proche du centre. L'angle dépend du domaine (mêmes axes que le radar d'analyse).
// ---------------------------------------------------------------------------
const VB = 640;
const CX = VB / 2;
const CY = VB / 2;
const R_MIN = 70;
const R_MAX = 230;
const NODE_R = 24;
const RING_SCORES = [85, 70, 55, 40];
const AXES = DOMAIN_ORDER.map((domain, i) => ({ domain, angle: -90 + i * 72 }));

function radiusFor(score) {
  const s = Math.min(100, Math.max(40, score));
  return R_MIN + ((R_MAX - R_MIN) * (100 - s)) / 60;
}

function polar(angleDeg, r) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}

function placeOffers(offers) {
  const groups = {};
  offers.forEach((o) => {
    (groups[o.domain] = groups[o.domain] || []).push(o);
  });
  return offers.map((o) => {
    const axis = AXES.find((a) => a.domain === o.domain);
    const group = groups[o.domain];
    const offset = (group.indexOf(o) - (group.length - 1) / 2) * 36;
    const { x, y } = polar((axis ? axis.angle : 0) + offset, radiusFor(o.score));
    return { ...o, x, y };
  });
}

const PLACED = placeOffers(OFFERS);

function mapsUrl(offer) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    offer.address
  )}`;
}

function initials(company) {
  return company.replace(/^Société\s+/i, "").trim().slice(0, 2).toUpperCase();
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

// Aplatit une section du CV (plusieurs lignes) en un court résumé d'une ligne.
function summarize(text, max = 140) {
  if (!text) return null;
  const flat = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" · ");
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function scoreLevel(score) {
  if (score >= 80) return "high";
  if (score >= 65) return "mid";
  return "low";
}

// Anneau de score (SVG, sans dépendance)
function ScoreRing({ score, size = 58 }) {
  const r = 23;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <svg
      className={`home-ring ${scoreLevel(score)}`}
      width={size}
      height={size}
      viewBox="0 0 58 58"
      role="img"
      aria-label={`Compatibilité ${score}%`}
    >
      <circle className="home-ring-track" cx="29" cy="29" r={r} />
      <circle
        className="home-ring-value"
        cx="29"
        cy="29"
        r={r}
        transform="rotate(-90 29 29)"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ "--ring-full": circumference }}
      />
      <text x="29" y="29" textAnchor="middle" dominantBaseline="central">
        {score}%
      </text>
    </svg>
  );
}

function StepIcon({ state }) {
  if (state === "done") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M5.5 9.3l2.4 2.4 4.6-4.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return <span className={`home-dot is-${state}`} aria-hidden="true" />;
}

// Radar de matching : le centre = toi, chaque société est un nœud cliquable.
function MatchRadar({ show, activeId, onActive, onTip, userInitial }) {
  return (
    <svg
      className="home-rd"
      viewBox={`0 0 ${VB} ${VB}`}
      role="group"
      aria-label="Radar de compatibilité entre ton profil et les offres"
    >
      {/* Anneaux de compatibilité */}
      {RING_SCORES.map((s) => (
        <circle key={s} className="home-rd-ring" cx={CX} cy={CY} r={radiusFor(s)} />
      ))}

      {/* Axes + noms des domaines */}
      {AXES.map((a) => {
        const end = polar(a.angle, R_MAX);
        const start = polar(a.angle, 34);
        const label = polar(a.angle, R_MAX + 30);
        const c = Math.cos((a.angle * Math.PI) / 180);
        const anchor = c > 0.35 ? "start" : c < -0.35 ? "end" : "middle";
        return (
          <g key={a.domain}>
            <line
              className="home-rd-spoke"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
            <text
              className="home-rd-axis"
              x={label.x}
              y={label.y}
              textAnchor={anchor}
              dominantBaseline="middle"
            >
              {a.domain}
            </text>
          </g>
        );
      })}

      {/* Pourcentages des anneaux */}
      {RING_SCORES.map((s) => {
        const p = polar(-54, radiusFor(s));
        return (
          <text
            key={s}
            className="home-rd-ringlabel"
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {s}%
          </text>
        );
      })}

      {/* Centre : l'étudiant */}
      <circle className="home-rd-me" cx={CX} cy={CY} r="26" />
      <text
        className="home-rd-me-text"
        x={CX}
        y={CY}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {userInitial}
      </text>
      <text className="home-rd-you" x={CX} y={CY + 44} textAnchor="middle">
        Toi
      </text>

      {/* Sociétés */}
      {show &&
        PLACED.map((o, i) => (
          <g
            key={o.id}
            className={`home-node ${scoreLevel(o.score)}${
              activeId === o.id ? " is-active" : ""
            }`}
            style={{ "--i": i }}
          >
            <a
              href={mapsUrl(o)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${o.title}, ${o.company}, ${o.city}, compatibilité ${o.score}%. Ouvrir la position sur la map`}
              onMouseEnter={() => {
                onActive(o.id);
                onTip(o.id);
              }}
              onMouseLeave={() => {
                onActive(null);
                onTip(null);
              }}
              onFocus={() => {
                onActive(o.id);
                onTip(o.id);
              }}
              onBlur={() => {
                onActive(null);
                onTip(null);
              }}
            >
              <g className="home-node-body">
                <circle className="home-node-bg" cx={o.x} cy={o.y} r={NODE_R} />
                {o.logo ? (
                  <>
                    <clipPath id={`logo-${o.id}`}>
                      <circle cx={o.x} cy={o.y} r={NODE_R - 4} />
                    </clipPath>
                    <image
                      href={o.logo}
                      x={o.x - NODE_R + 4}
                      y={o.y - NODE_R + 4}
                      width={(NODE_R - 4) * 2}
                      height={(NODE_R - 4) * 2}
                      clipPath={`url(#logo-${o.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <text
                    className="home-node-initials"
                    x={o.x}
                    y={o.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {initials(o.company)}
                  </text>
                )}
                <text
                  className="home-node-score"
                  x={o.x}
                  y={o.y + NODE_R + 14}
                  textAnchor="middle"
                >
                  {o.score}%
                </text>
              </g>
            </a>
          </g>
        ))}
    </svg>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const cvUpload = useCvUpload();
  const analysis = useAnalysis();

  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeId, setActiveId] = useState(null); // offre mise en avant
  const [tipId, setTipId] = useState(null); // offre dont on affiche l'info-bulle

  const cv = cvUpload.status === "done" ? cvUpload.cv : null;
  const analysing = analysis.status === "running";
  const busy = cvUpload.status === "uploading" || analysing;
  const done = analysis.status === "done";

  function handleFile(selected) {
    if (!selected || busy) return;
    analysis.reset();
    setSaved(false);
    cvUpload.upload(selected); // vérifie le PDF et la taille, puis l'envoie au backend
  }

  function onInputChange(e) {
    handleFile(e.target.files[0]);
    e.target.value = ""; // permet de re-choisir le même fichier
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function launchAnalysis() {
    if (!cv || analysing) return;
    setSaved(false);
    analysis.run(cv.text);
  }

  const steps = [
    { label: STEP_LABELS[0], state: UPLOAD_TO_STEP[cvUpload.status] },
    { label: STEP_LABELS[1], state: ANALYSIS_TO_STEP[analysis.status] },
    { label: STEP_LABELS[2], state: "waiting", text: "Bientôt" },
  ];

  const selectedSkills = new Set(analysis.skills.map((s) => s.name));
  const addableSkills = analysis.catalog.filter((s) => !selectedSkills.has(s.name));
  const radarData = DOMAIN_ORDER.map((domain) => ({
    domain,
    value: analysis.domains.find((d) => d.domain === domain)?.score ?? 0,
  }));
  const domainValue = Object.fromEntries(radarData.map((d) => [d.domain, d.value]));

  const displayName = user?.full_name || "Prénom Nom";
  const userInitial = displayName.trim().charAt(0).toUpperCase() || "?";
  const tipOffer = tipId ? PLACED.find((o) => o.id === tipId) : null;

  return (
    <div className="home">
      <header className="home-nav">
        <span className="home-logo">PFE Radar</span>
        <nav className="home-links" aria-label="Navigation principale">
          <a className="home-link is-active" href="#analyse">
            Analyse
          </a>
          <button type="button" className="home-link" disabled title="Bientôt">
            Offres
          </button>
          <button type="button" className="home-link" disabled title="Bientôt">
            Sauvegardes
          </button>
          <button type="button" className="home-logout" onClick={logout}>
            Déconnexion
          </button>
        </nav>
      </header>

      <main className="home-main" id="analyse">
        {/* ZONE 1 — Mon CV */}
        <section className="home-zone home-zone--cv">
          <div className="home-zone-head">
            <span className="home-zone-num">01</span>
            <h2>Mon CV</h2>
          </div>

          <div
            className={`home-drop${dragOver ? " is-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
          >
            <p>Glisse ton CV (PDF)</p>
            <button
              type="button"
              className="home-btn-outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              Choisir un fichier
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={onInputChange}
            />
          </div>

          {cvUpload.status === "uploading" && (
            <p className="home-info" role="status">
              Lecture du PDF…
            </p>
          )}

          {cvUpload.status === "error" && (
            <p className="home-error" role="alert">
              {cvUpload.error}
            </p>
          )}

          {cv && (
            <div className="home-file">
              <span className="home-file-icon">PDF</span>
              <div className="home-file-info">
                <span className="home-file-name" title={cv.filename}>
                  {cv.filename}
                </span>
                <span className="home-file-meta">
                  {formatSize(cv.size)} · chargé
                </span>
              </div>
            </div>
          )}

          {cv && (
            <dl className="home-profile home-fade">
              <div>
                <dt>Nom</dt>
                <dd className="is-strong">{displayName}</dd>
              </div>
              <div>
                <dt>Niveau</dt>
                <dd>{cv.level ?? "Non détecté"}</dd>
              </div>
              <div>
                <dt>Compétences</dt>
                <dd>
                  {done
                    ? analysis.skills.map((s) => s.name).join(", ") || "Aucune détectée"
                    : "Détectées à l'analyse"}
                </dd>
              </div>
              <div>
                <dt>Expériences</dt>
                <dd>{summarize(cv.sections?.experience) ?? "Non détecté"}</dd>
              </div>
              <div>
                <dt>Formation</dt>
                <dd>{summarize(cv.sections?.formation) ?? "Non détecté"}</dd>
              </div>
            </dl>
          )}

          <button
            type="button"
            className="home-btn"
            disabled={!cv || analysing}
            onClick={launchAnalysis}
          >
            {analysing ? "Analyse en cours…" : "Lancer l'analyse"}
          </button>
        </section>

        {/* ZONE 2 — Analyse */}
        <section className="home-zone home-zone--analyse">
          <div className="home-zone-head">
            <span className="home-zone-num">02</span>
            <h2>Analyse</h2>
          </div>

          <ul className="home-steps">
            {steps.map((s) => (
              <li key={s.label} className={`home-step is-${s.state}`}>
                <StepIcon state={s.state} />
                <span className="home-step-label">{s.label}</span>
                <span className="home-step-state">{s.text ?? STATE_TEXT[s.state]}</span>
              </li>
            ))}
          </ul>

          {analysis.status === "error" && (
            <p className="home-error" role="alert">
              {analysis.error}
            </p>
          )}

          {done ? (
            <>
              <div className="home-fade">
                <p className="home-label">Compétences détectées</p>
                {analysis.skills.length === 0 && (
                  <p className="home-empty">
                    Aucune compétence détectée : ajoute-les ci-dessous.
                  </p>
                )}
                <div className="home-chips">
                  {analysis.skills.map((skill) => (
                    <span className="home-chip" key={skill.name}>
                      {skill.name}
                      <button
                        type="button"
                        aria-label={`Retirer ${skill.name}`}
                        onClick={() => analysis.removeSkill(skill.name)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <select
                  className="home-select"
                  aria-label="Ajouter une compétence"
                  value=""
                  onChange={(e) => e.target.value && analysis.addSkill(e.target.value)}
                >
                  <option value="">Ajouter une compétence…</option>
                  {addableSkills.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.domain})
                    </option>
                  ))}
                </select>
              </div>

              <div className="home-fade">
                <p className="home-label">Profil par domaine</p>
                <div className="home-radar">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="#cfd9e2" />
                      <PolarAngleAxis
                        dataKey="domain"
                        tick={{ fill: "#334155", fontSize: 13 }}
                        tickFormatter={(d) => `${d} · ${domainValue[d]}%`}
                      />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        dataKey="value"
                        stroke="#0f766e"
                        strokeWidth={2}
                        fill="#0f766e"
                        fillOpacity={0.18}
                        dot={{ r: 3, fill: "#0f766e", strokeWidth: 0 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            analysis.status === "idle" && (
              <p className="home-empty">
                Charge ton CV puis lance l'analyse pour voir tes compétences et
                ton profil par domaine.
              </p>
            )
          )}
        </section>

        {/* ZONE 3 — Résultats (pleine largeur, sous les deux autres) */}
        <section className="home-zone home-zone--results">
          <div className="home-zone-head">
            <span className="home-zone-num">03</span>
            <h2>Résultats</h2>
          </div>

          <div className="home-results">
            <div className="home-results-graph">
              {done && (
                <p className="home-demo">
                  Données de démonstration : le matching réel avec les offres
                  arrive à l'étape suivante.
                </p>
              )}
              <p className="home-hint">
                Plus une société est proche du centre, plus l'offre correspond à
                ton profil. Clique sur une société pour ouvrir sa position sur
                la map.
              </p>

              <div className="home-match">
                <MatchRadar
                  show={done}
                  activeId={activeId}
                  onActive={setActiveId}
                  onTip={setTipId}
                  userInitial={userInitial}
                />

                {tipOffer && (
                  <div
                    className={`home-tip${tipOffer.y < VB * 0.3 ? " is-below" : ""}`}
                    style={{
                      left: `${(tipOffer.x / VB) * 100}%`,
                      top: `${(tipOffer.y / VB) * 100}%`,
                    }}
                    role="tooltip"
                  >
                    <strong>{tipOffer.title}</strong>
                    <span>
                      {tipOffer.company} · {tipOffer.city}
                    </span>
                    <span>Compatibilité {tipOffer.score}%</span>
                    <em>Clique pour ouvrir la map ↗</em>
                  </div>
                )}
              </div>
            </div>

            <div className="home-results-side">
              {done ? (
                <>
                  <ul className="home-offers home-fade">
                    {PLACED.map((o) => (
                      <li
                        key={o.id}
                        className={`home-offer${activeId === o.id ? " is-active" : ""}`}
                        onMouseEnter={() => setActiveId(o.id)}
                        onMouseLeave={() => setActiveId(null)}
                      >
                        <div className="home-offer-top">
                          <span className={`home-avatar ${scoreLevel(o.score)}`}>
                            {initials(o.company)}
                          </span>
                          <div className="home-offer-info">
                            <span className="home-offer-title">{o.title}</span>
                            <span className="home-offer-meta">
                              {o.company} · {o.city}
                            </span>
                          </div>
                          <ScoreRing score={o.score} size={48} />
                        </div>

                        <div className="home-offer-bottom">
                          <div className="home-skills">
                            {o.missing.length > 0 ? (
                              <>
                                <span className="home-skills-label">À renforcer</span>
                                {o.missing.map((s) => (
                                  <span className="home-skill-miss" key={s}>
                                    {s}
                                  </span>
                                ))}
                              </>
                            ) : (
                              <span className="home-skills-label">
                                Toutes les compétences requises
                              </span>
                            )}
                          </div>
                          <a
                            className="home-maps"
                            href={mapsUrl(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Voir la map ↗
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button type="button" className="home-more" disabled title="Bientôt">
                    Voir toutes les offres →
                  </button>

                  <button
                    type="button"
                    className="home-btn home-btn-save"
                    onClick={() => setSaved(true)}
                    disabled={saved}
                  >
                    {saved ? "Profil sauvegardé ✓" : "Sauvegarder mon profil"}
                  </button>
                </>
              ) : (
                <p className="home-empty">
                  Les offres correspondant à ton profil apparaîtront ici, avec
                  les compétences à renforcer pour chacune.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}