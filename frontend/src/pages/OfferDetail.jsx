import { useMutation, useQuery } from "@apollo/client";
import { Link, NavLink, useParams } from "react-router-dom";
import { OFFER_QUERY } from "../graphql/offer";
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

  const offer = data?.offer;
  const saved = (savedData?.savedOfferIds ?? []).includes(offerId);
  const published = formatDate(offer?.publishedAt);
  const deadline = formatDate(offer?.deadline);

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
      </main>
    </div>
  );
}