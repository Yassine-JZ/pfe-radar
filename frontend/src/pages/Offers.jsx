import { useState } from "react";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { CITIES_QUERY, OFFERS_QUERY } from "../graphql/offers";
import {
  SAVED_OFFERS_QUERY,
  SAVED_OFFER_IDS_QUERY,
  TOGGLE_SAVE_OFFER_MUTATION,
}
from "../graphql/savedOffers";
import { AI_SEARCH_QUERY } from "../graphql/aiSearch";
import { DOMAINS, OFFER_TYPES, PAGE_SIZE } from "../offers/constants";
import "./Offers.css";

const MAX_PILLS = 6;

function formatDeadline(deadline) {
  if (!deadline) return null;
  const date = new Date(deadline).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return `avant le ${date}`;
}
function mapsUrl(offer) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${offer.company} ${offer.city} Tunisie`
  )}`;
}
function OfferCard({ offer, saved, onToggle }) {
  const shown = offer.skills.slice(0, MAX_PILLS);
  const extra = offer.skills.length - shown.length;
  const deadline = formatDeadline(offer.deadline);

  return (
    <article className="offers-card">
      <div className="offers-card-head">
        <h2 className="offers-card-title">
          <Link to={`/offres/${offer.id}`}>{offer.title}</Link>
        </h2>
        <span className="offers-tag">{offer.type}</span>
      </div>
      <p className="offers-card-meta">
        {offer.company} · {offer.city} · {offer.domain}
        {deadline ? ` · ${deadline}` : ""}
      </p>
      <div className="offers-card-foot">
        <div className="offers-pills">
          {shown.map((skill) => (
            <span className="offers-pill" key={skill}>
              {skill}
            </span>
          ))}
          {extra > 0 && <span className="offers-pill offers-pill-more">+{extra}</span>}
        </div>
        <div className="offers-links">
                      <button
            type="button"
            className="offers-star"
            aria-pressed={saved}
            title={saved ? "Retirer des sauvegardes" : "Sauvegarder cette offre"}
            onClick={() => onToggle(offer.id)}
          >
            {saved ? "★ Sauvegardée" : "☆ Sauvegarder"}
          </button>
          {offer.applyUrl && (
            <a href={offer.applyUrl} target="_blank" rel="noopener noreferrer">
              Postuler ↗
            </a>
          )}
        <a href={mapsUrl(offer)} target="_blank" rel="noopener noreferrer">
  Voir la map ↗
</a>
        </div>
      </div>
    </article>
  );
}

export default function Offers() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const city = params.get("ville") ?? "";
  const type = params.get("type") ?? "";
  const domain = params.get("domaine") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [text, setText] = useState(q);

  const { data: citiesData } = useQuery(CITIES_QUERY);
    const { data: savedData } = useQuery(SAVED_OFFER_IDS_QUERY);
  const [toggleSave] = useMutation(TOGGLE_SAVE_OFFER_MUTATION, {
    refetchQueries: [{ query: SAVED_OFFER_IDS_QUERY }, { query: SAVED_OFFERS_QUERY }],
  });
  const savedIds = new Set(savedData?.savedOfferIds ?? []);
    const [aiText, setAiText] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [runAiSearch, { loading: aiLoading, error: aiError }] = useLazyQuery(
    AI_SEARCH_QUERY,
    { fetchPolicy: "network-only" }
  );

  async function submitAi(event) {
    event.preventDefault();
    const question = aiText.trim();
    if (!question) return;
    setAiNote("");
    const result = await runAiSearch({ variables: { query: question } });
    const filters = result.data?.aiSearchFilters;
    if (!filters) return;

    setText(filters.search ?? "");
    setAiNote(filters.explanation);
    const next = new URLSearchParams();
    if (filters.search) next.set("q", filters.search);
    if (filters.city) next.set("ville", filters.city);
    if (filters.type) next.set("type", filters.type);
    if (filters.domain) next.set("domaine", filters.domain);
    setParams(next);
  }
  const { data, loading, error, refetch } = useQuery(OFFERS_QUERY, {
    variables: {
      search: q || null,
      city: city || null,
      type: type || null,
      domain: domain || null,
      page,
      pageSize: PAGE_SIZE,
    },
    fetchPolicy: "cache-and-network",
  });

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  }

  function submitSearch(event) {
    event.preventDefault();
    update({ q: text.trim() });
  }

  function reset() {
    setText("");
    setParams(new URLSearchParams());
  }

  const result = data?.offers;
  const hasFilters = Boolean(q || city || type || domain);
  const cities = citiesData?.cities ?? [];

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
        <div className="offers-title">
          <span className="offers-badge">01</span>
          <h1>Offres</h1>
        </div>
        <form className="offers-ai" onSubmit={submitAi}>
          <input
            type="text"
            className="offers-search"
            placeholder="✨ Décris ce que tu cherches : « stage PFE data à Tunis avec Python »"
            value={aiText}
            maxLength={300}
            onChange={(event) => setAiText(event.target.value)}
          />
          <button
            type="submit"
            className="btn offers-btn"
            disabled={aiLoading || !aiText.trim()}
          >
            {aiLoading ? "Analyse…" : "Recherche IA"}
          </button>
        </form>
        {aiError && <p className="error">Recherche IA indisponible : {aiError.message}</p>}
        {aiNote && hasFilters && <p className="offers-ai-note">✨ {aiNote}</p>}
        <form className="offers-filters" onSubmit={submitSearch}>
          <input
            type="search"
            className="offers-search"
            placeholder="Titre, société, description, compétence…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <select value={city} onChange={(e) => update({ ville: e.target.value })}>
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Tous les types</option>
            {OFFER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={domain} onChange={(e) => update({ domaine: e.target.value })}>
            <option value="">Tous les domaines</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button type="submit" className="btn offers-btn">
            Rechercher
          </button>
          {hasFilters && (
            <button type="button" className="offers-reset" onClick={reset}>
              Réinitialiser
            </button>
          )}
        </form>

        {error && (
          <div className="offers-state">
            <p className="error">Impossible de charger les offres : {error.message}</p>
            <button type="button" className="btn offers-btn" onClick={() => refetch()}>
              Réessayer
            </button>
          </div>
        )}

        {!error && loading && !result && (
          <div className="offers-state">
            <p className="hint">Chargement des offres…</p>
          </div>
        )}

        {!error && result && result.items.length === 0 && (
          <div className="offers-state">
            <p className="hint">
              {hasFilters
                ? "Aucune offre ne correspond à votre recherche."
                : "Aucune offre disponible pour le moment."}
            </p>
            {hasFilters && (
              <button type="button" className="offers-reset" onClick={reset}>
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {!error && result && result.items.length > 0 && (
          <>
            <p className="offers-count">
              {result.total} offre{result.total > 1 ? "s" : ""}
            </p>
            <div className="offers-list">
              {result.items.map((offer) => (
                               <OfferCard
                  key={offer.id}
                  offer={offer}
                  saved={savedIds.has(offer.id)}
                  onToggle={(id) => toggleSave({ variables: { offerId: id } })}
                />
              ))}
            </div>
            <div className="offers-pager">
              <button
                type="button"
                className="offers-reset"
                disabled={result.page <= 1}
                onClick={() => update({ page: result.page > 2 ? String(result.page - 1) : "" })}
              >
                ← Précédent
              </button>
              <span>
                Page {result.page} sur {result.totalPages}
              </span>
              <button
                type="button"
                className="offers-reset"
                disabled={result.page >= result.totalPages}
                onClick={() => update({ page: String(result.page + 1) })}
              >
                Suivant →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}