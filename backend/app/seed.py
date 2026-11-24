import json
import re
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import select

from . import models
from .database import Base, SessionLocal, engine

DATA = Path(__file__).parent / "data"
SOURCE = "seed"
DOMAINS = {"Data", "IA / ML", "Web", "DevOps", "Mobile"}
TYPES = {"PFE", "Stage d'été", "Emploi"}


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:150]


def external_id(offer: dict) -> str:
    """Identifiant stable d'une offre du fichier seed.

    On prend l'identifiant du lien d'origine (?id=inetum-20 ou #pf-s01),
    sinon une version « slug » de société + titre.
    """
    url = offer.get("apply_url") or ""
    match = re.search(r"[?&]id=([^&#]+)", url) or re.search(r"#([^#]+)$", url)
    if match:
        return match.group(1)
    return slug(f"{offer['company']} {offer['title']}")


def main():
    Base.metadata.create_all(bind=engine)
    skills = {s["name"] for s in load("competences.json")}
    cities = {c["name"]: c for c in load("villes.json")}

    db = SessionLocal()
    created = updated = 0
    seen: set[str] = set()
    now = datetime.now(timezone.utc)
    try:
        for o in load("offres_seed.json"):
            title = o["title"]
            if o["domain"] not in DOMAINS:
                raise ValueError(f"Domaine inconnu pour '{title}': {o['domain']}")
            if o["type"] not in TYPES:
                raise ValueError(f"Type inconnu pour '{title}': {o['type']}")
            if o["city"] not in cities:
                raise ValueError(f"Ville inconnue pour '{title}': {o['city']}")
            unknown = set(o["skills"]) - skills
            if unknown:
                raise ValueError(f"Compétences hors référentiel pour '{title}': {unknown}")

            ext_id = external_id(o)
            if ext_id in seen:
                raise ValueError(f"Identifiant en double dans le fichier: '{ext_id}' ({title})")
            seen.add(ext_id)

            city = cities[o["city"]]
            values = dict(
                title=title,
                company=o["company"],
                city=o["city"],
                latitude=city["latitude"],
                longitude=city["longitude"],
                type=o["type"],
                domain=o["domain"],
                description=o["description"],
                skills=o["skills"],
                apply_url=o.get("apply_url"),
                published_at=date.fromisoformat(o["published_at"]),
                deadline=date.fromisoformat(o["deadline"]) if o.get("deadline") else None,
                fetched_at=now,
            )

            existing = db.scalar(
                select(models.Offer).where(
                    models.Offer.source == SOURCE,
                    models.Offer.external_id == ext_id,
                )
            )
            if existing:
                # Relancer le seed met à jour l'offre (ex. compétences corrigées dans le JSON).
                for key, value in values.items():
                    setattr(existing, key, value)
                updated += 1
            else:
                db.add(models.Offer(source=SOURCE, external_id=ext_id, **values))
                created += 1
        db.commit()
        total = db.query(models.Offer).count()
        print(f"{created} offres ajoutées, {updated} mises à jour, {total} au total.")
    finally:
        db.close()


if __name__ == "__main__":
    main()