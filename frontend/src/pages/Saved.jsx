import { useMutation, useQuery } from "@apollo/client";
import { NavLink } from "react-router-dom";
import {
  DELETE_PROFILE_MUTATION,
  SAVED_PROFILES_QUERY,
} from "../graphql/profiles";
import {
  SAVED_OFFERS_QUERY,
  SAVED_OFFER_IDS_QUERY,
  TOGGLE_SAVE_OFFER_MUTATION,
} from "../graphql/savedOffers";
import "./Offers.css";

function formatDate(value) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function mapsUrl(offer) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${offer.company} ${offer.city} Tunisie`
  )}`;
}

function ProfileCard({ profile, onDelete }) {
  const domains = [...profile.domains].sort((a, b) => b.score - a.score);

  return (
    <article className="offers-card">
      <div className="offers-card-head">
        <h3 className="offers-card-title">{profile.name}</h3>
        <span className="offers-tag">{profile.skills.length} compétences</span>
      </div>
      <p className="offers-card-meta">Sauvegardé le {formatDate(profile.createdAt)}</p>

      <div className="offers-pills">
        {profile.skills.map((skill) => (
          <span className="offers-pill" key={skill}>
            {skill}
          </span>
        ))}
      </div>

      {domains.length > 0 && (
        <div className="saved-block">
          <h4 className="saved-block-title">Domaines</h4>
          {domains.map((d) => (
            <div className="saved-bar-row" key={d.domain}>
              <span className="saved-bar-label">{d.domain}</span>
              <div className="saved-bar">
                <div className="saved-bar-fill" style={{ width: `${d.score}%` }} />
              </div>
              <span className="saved-bar-value">{d.score}%</span>
            </div>
          ))}
        </div>
      )}

      {profile.topOffers.length > 0 && (
        <div className="saved-block">
          <h4 className="saved-block-title">Meilleures offres à ce moment-là</h4>
          <ul className="saved-top">
            {profile.topOffers.map((o) => (
              <li key={o.offerId}>
                <span className="saved-top-score">{o.score}%</span>
                <span className="saved-top-text">
                  {o.title} · {o.company} · {o.city}
                  {o.missing.length > 0 && (
                    <span className="saved-top-missing">
                      {" "}
                      — à renforcer : {o.missing.join(", ")}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="offers-links saved-actions">
        <button type="button" className="offers-reset" onClick={() => onDelete(profile.id)}>
          Supprimer
        </button>
      </div>
    </article>
  );
}

export default function Saved() {
  const profilesQuery = useQuery(SAVED_PROFILES_QUERY, {
    fetchPolicy: "cache-and-network",
  });
  const offersQuery = useQuery(SAVED_OFFERS_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const [deleteProfile] = useMutation(DELETE_PROFILE_MUTATION, {
    refetchQueries: [{ query: SAVED_PROFILES_QUERY }],
  });
  const [toggleSave] = useMutation(TOGGLE_SAVE_OFFER_MUTATION, {
    refetchQueries: [{ query: SAVED_OFFERS_QUERY }, { query: SAVED_OFFER_IDS_QUERY }],
  });

  const profiles = profilesQuery.data?.savedProfiles ?? [];
  const offers = offersQuery.data?.savedOffers ?? [];

  function removeProfile(id) {
    if (window.confirm("Supprimer ce profil sauvegardé ?")) {
      deleteProfile({ variables: { id } });
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
        <div className="offers-title">
          <span className="offers-badge">02</span>
          <h1>Sauvegardes</h1>
        </div>

        <h2 className="offers-section-title">Offres sauvegardées</h2>

        {offersQuery.error && (
          <div className="offers-state">
            <p className="error">Impossible de charger : {offersQuery.error.message}</p>
            <button
              type="button"
              className="btn offers-btn"
              onClick={() => offersQuery.refetch()}
            >
              Réessayer
            </button>
          </div>
        )}

        {!offersQuery.error && offersQuery.loading && !offersQuery.data && (
          <div className="offers-state">
            <p className="hint">Chargement…</p>
          </div>
        )}

        {!offersQuery.error && offersQuery.data && offers.length === 0 && (
          <div className="offers-state">
            <p className="hint">
              Aucune offre sauvegardée. Sur la page Offres, clique sur « ☆ Sauvegarder ».
            </p>
          </div>
        )}

        {!offersQuery.error && offers.length > 0 && (
          <div className="offers-list">
            {offers.map((o) => (
              <article className="offers-card" key={o.id}>
                <div className="offers-card-head">
                  <h3 className="offers-card-title">{o.title}</h3>
                  <span className="offers-tag">{o.type}</span>
                </div>
                <p className="offers-card-meta">
                  {o.company} · {o.city} · {o.domain}
                </p>
                <div className="offers-card-foot">
                  <div className="offers-pills">
                    {o.skills.map((skill) => (
                      <span className="offers-pill" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="offers-links">
                    {o.applyUrl && (
                      <a href={o.applyUrl} target="_blank" rel="noopener noreferrer">
                        Postuler ↗
                      </a>
                    )}
                    <a href={mapsUrl(o)} target="_blank" rel="noopener noreferrer">
                      Voir la map ↗
                    </a>
                    <button
                      type="button"
                      className="offers-star"
                      onClick={() => toggleSave({ variables: { offerId: o.id } })}
                    >
                      ★ Retirer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <h2 className="offers-section-title">Profils sauvegardés</h2>

        {profilesQuery.error && (
          <div className="offers-state">
            <p className="error">Impossible de charger : {profilesQuery.error.message}</p>
            <button
              type="button"
              className="btn offers-btn"
              onClick={() => profilesQuery.refetch()}
            >
              Réessayer
            </button>
          </div>
        )}

        {!profilesQuery.error && profilesQuery.loading && !profilesQuery.data && (
          <div className="offers-state">
            <p className="hint">Chargement…</p>
          </div>
        )}

        {!profilesQuery.error && profilesQuery.data && profiles.length === 0 && (
          <div className="offers-state">
            <p className="hint">
              Aucun profil sauvegardé. Lance une analyse sur la page Analyse, puis clique sur
              « Sauvegarder mon profil ».
            </p>
          </div>
        )}

        {!profilesQuery.error && profiles.length > 0 && (
          <div className="offers-list">
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} onDelete={removeProfile} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}