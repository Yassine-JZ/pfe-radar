import { useState } from "react";
import { useQuery } from "@apollo/client";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { CITIES_QUERY, OFFERS_QUERY } from "../graphql/offers";
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

function OfferCard({ offer }) {
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
          {offer.applyUrl && (
            <a href={offer.applyUrl} target="_blank" rel="noopener noreferrer">
              Postuler ↗
            </a>
          )}
          <Link to={`/offres/carte?offre=${offer.id}`}>Voir la map ↗</Link>
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
        </nav>
      </header>

      <main className="offers-main">
        <div className="offers-title">
          <span className="offers-badge">01</span>
          <h1>Offres</h1>
        </div>

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
                <OfferCard key={offer.id} offer={offer} />
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