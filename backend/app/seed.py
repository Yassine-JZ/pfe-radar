import json
from datetime import date
from pathlib import Path

from sqlalchemy import select

from . import models
from .database import Base, SessionLocal, engine

DATA = Path(__file__).parent / "data"
DOMAINS = {"Data", "IA / ML", "Web", "DevOps", "Mobile"}
TYPES = {"PFE", "Stage d'été", "Emploi"}


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def main():
    Base.metadata.create_all(bind=engine)
    skills = {s["name"] for s in load("competences.json")}
    cities = {c["name"]: c for c in load("villes.json")}

    db = SessionLocal()
    created = 0
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

            exists = db.scalar(
                select(models.Offer).where(
                    models.Offer.title == title,
                    models.Offer.company == o["company"],
                )
            )
            if exists:
                continue

            city = cities[o["city"]]
            db.add(
                models.Offer(
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
                )
            )
            created += 1
        db.commit()
        total = db.query(models.Offer).count()
        print(f"{created} offres ajoutées, {total} au total.")
    finally:
        db.close()


if __name__ == "__main__":
    main()