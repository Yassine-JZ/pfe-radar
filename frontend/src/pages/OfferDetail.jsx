import { useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { Link, NavLink, useParams } from "react-router-dom";
import { AI_COVER_LETTER_QUERY, AI_MATCH_QUERY } from "../graphql/aiOffer";
import { OFFER_QUERY } from "../graphql/offer";
import { SAVED_PROFILES_QUERY } from "../graphql/profiles";
import {
  SAVED_OFFERS_QUERY,
  SAVED_OFFER_IDS_QUERY,
  TOGGLE_SAVE_OFFER_MUTATION,
} from "../graphql/savedOffers";
import "./Offers.css";

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function mapsUrl(offer) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${offer.company} ${offer.city} Tunisie`
  )}`;
}

export default function OfferDetail() {
  const { id } = useParams();
  const offerId = Number(id);

  const { data, loading, error, refetch } = useQuery(OFFER_QUERY, {
    variables: { id: offerId },
    skip: !Number.isInteger(offerId),
  });
  const { data: savedData } = useQuery(SAVED_OFFER_IDS_QUERY);
  const [toggleSave] = useMutation(TOGGLE_SAVE_OFFER_MUTATION, {
    refetchQueries: [{ query: SAVED_OFFER_IDS_QUERY }, { query: SAVED_OFFERS_QUERY }],
  });

  const { data: profilesData } = useQuery(SAVED_PROFILES_QUERY);
  const profiles = profilesData?.savedProfiles ?? [];
  const [profileId, setProfileId] = useState("");
  const activeProfileId = profileId || (profiles[0] ? String(profiles[0].id) : "");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const [runMatch, matchState] = useLazyQuery(AI_MATCH_QUERY, {
    fetchPolicy: "network-only",
  });
  const [runLetter, letterState] = useLazyQuery(AI_COVER_LETTER_QUERY, {
    fetchPolicy: "network-only",
  });

  const offer = data?.offer;
  const saved = (savedData?.savedOfferIds ?? []).includes(offerId);
  const published = formatDate(offer?.publishedAt);
  const deadline = formatDate(offer?.deadline);
  const match = matchState.data?.aiMatchAnalysis;
  const letter = letterState.data?.aiCoverLetter;

  function analyse() {
    runMatch({ variables: { offerId, profileId: Number(activeProfileId) } });
  }

  function writeLetter() {
    runLetter({
      variables: {
        offerId,
        profileId: Number(activeProfileId),
        notes: notes.trim() || null,
      },
    });
  }

  async function copyLetter() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="offers-page">
      <header className="offers-nav">
        <span className="offers-brand">PFE Radar</span>
        <nav className="offers-nav-links">
          <NavLink to="/" end>
            Analyse
          </NavLink>
          <NavLink to="/offres">Offres</NavLink>
          <NavLink to="/sauvegardes">Sauvegardes</NavLink>
        </nav>
      </header>

      <main className="offers-main">
        <Link to="/offres" className="detail-back">
          ← Retour aux offres
        </Link>

        {!Number.isInteger(offerId) && (
          <div className="offers-state">
            <p className="error">Offre invalide.</p>
          </div>
        )}

        {error && (
          <div className="offers-state">
            <p className="error">Impossible de charger l'offre : {error.message}</p>
            <button type="button" className="btn offers-btn" onClick={() => refetch()}>
              Réessayer
            </button>
          </div>
        )}

        {!error && loading && !offer && (
          <div className="offers-state">
            <p className="hint">Chargement de l'offre…</p>
          </div>
        )}

        {!error && !loading && data && !offer && (
          <div className="offers-state">
            <p className="hint">Cette offre n'existe pas ou a été supprimée.</p>
          </div>
        )}

        {offer && (
          <article className="offers-card detail-card">
            <div className="offers-card-head">
              <h1 className="detail-title">{offer.title}</h1>
              <span className="offers-tag">{offer.type}</span>
            </div>
            <p className="offers-card-meta">
              {offer.company} · {offer.city} · {offer.domain}
            </p>
            <p className="offers-card-meta">
              {published ? `Publiée le ${published}` : ""}
              {published && deadline ? " · " : ""}
              {deadline ? `Date limite : ${deadline}` : ""}
            </p>

            <h2 className="detail-section">Description</h2>
            <p className="detail-description">{offer.description}</p>

            <h2 className="detail-section">Compétences demandées</h2>
            <div className="offers-pills">
              {offer.skills.map((skill) => (
                <span className="offers-pill" key={skill}>
                  {skill}
                </span>
              ))}
            </div>

            <div className="offers-links detail-actions">
              {offer.applyUrl && (
                <a href={offer.applyUrl} target="_blank" rel="noopener noreferrer">
                  Postuler ↗
                </a>
              )}
              <a href={mapsUrl(offer)} target="_blank" rel="noopener noreferrer">
                Voir la map ↗
              </a>
              <button
                type="button"
                className="offers-star"
                onClick={() => toggleSave({ variables: { offerId } })}
              >
                {saved ? "★ Sauvegardée" : "☆ Sauvegarder"}
              </button>
            </div>
          </article>
        )}

        {offer && (
          <section className="offers-card detail-ai">
            <h2 className="detail-ai-title">✨ Mon profil face à cette offre</h2>

            {profiles.length === 0 ? (
              <p className="hint">
                Sauvegarde d'abord un profil : lance une analyse sur la page Analyse, puis clique
                sur « Sauvegarder mon profil ».
              </p>
            ) : (
              <>
                <label className="detail-label">
                  Profil utilisé
                  <select
                    className="detail-select"
                    value={activeProfileId}
                    onChange={(event) => setProfileId(event.target.value)}
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.skills.length} compétences)
                      </option>
                    ))}
                  </select>
                </label>

                <div className="detail-ai-actions">
                  <button
                    type="button"
                    className="btn offers-btn"
                    disabled={matchState.loading}
                    onClick={analyse}
                  >
                    {matchState.loading ? "Analyse…" : "Analyser mon match"}
                  </button>
                </div>

                {matchState.error && (
                  <p className="error">Analyse indisponible : {matchState.error.message}</p>
                )}

                {match && (
                  <div className="detail-ai-result">
                    <p className="detail-score">{match.score}% des compétences demandées couvertes</p>
                    <p>{match.summary}</p>

                    {match.covered.length > 0 && (
                      <>
                        <h3 className="detail-mini-title">Tu as déjà</h3>
                        <div className="offers-pills">
                          {match.covered.map((s) => (
                            <span className="offers-pill offers-pill-ok" key={s}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {match.missing.length > 0 && (
                      <>
                        <h3 className="detail-mini-title">À renforcer</h3>
                        <div className="offers-pills">
                          {match.missing.map((s) => (
                            <span className="offers-pill offers-pill-missing" key={s}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {match.plan.length > 0 && (
                      <>
                        <h3 className="detail-mini-title">Plan pour progresser</h3>
                        <ul className="detail-plan">
                          {match.plan.map((step) => (
                            <li key={step.skill}>
                              <strong>{step.skill} :</strong> {step.tip}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                <h3 className="detail-mini-title detail-letter-title">Lettre de motivation</h3>
                <label className="detail-label">
                  Tes projets ou expériences (facultatif, 800 caractères maximum)
                  <textarea
                    className="detail-notes"
                    rows={4}
                    maxLength={800}
                    value={notes}
                    placeholder="Ex : stage d'été sur une application Flutter, projet de fin d'année sur un tableau de bord Power BI…"
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>

                <div className="detail-ai-actions">
                  <button
                    type="button"
                    className="btn offers-btn"
                    disabled={letterState.loading}
                    onClick={writeLetter}
                  >
                    {letterState.loading ? "Écriture…" : "Générer ma lettre"}
                  </button>
                </div>

                {letterState.error && (
                  <p className="error">Lettre indisponible : {letterState.error.message}</p>
                )}

                {letter && (
                  <div className="detail-ai-result">
                    <p className="detail-letter">{letter}</p>
                    <p className="hint">
                      Brouillon écrit par une IA : relis-le et corrige-le avant de l'envoyer.
                    </p>
                    <button type="button" className="offers-reset" onClick={copyLetter}>
                      {copied ? "Copiée ✓" : "Copier la lettre"}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}