from dataclasses import dataclass

# Une offre est « proche » du profil à partir de ce score (le radar de l'écran
# Home place les offres en dessous de 40 sur l'anneau extérieur).
STRONG_SCORE = 40
# Sous ce nombre d'offres proches, on considère que les offres de la base ne
# couvrent pas bien le CV (plus tard : déclenche la recherche d'autres offres).
MIN_STRONG_OFFERS = 5


@dataclass
class Match:
    offer: object  # models.Offer (ou tout objet avec .skills et .title)
    score: int
    covered: list[str]
    missing: list[str]


def match_offer(offer, user_skills: set[str]) -> Match:
    """Score = compétences requises par l'offre que le CV couvre / compétences requises.

    Explicable devant un jury : « 4 compétences sur 5, il manque Power BI ».
    L'ordre des compétences de l'offre est conservé.
    """
    required = list(dict.fromkeys(offer.skills or []))
    covered = [s for s in required if s in user_skills]
    missing = [s for s in required if s not in user_skills]
    score = round(100 * len(covered) / len(required)) if required else 0
    return Match(offer=offer, score=score, covered=covered, missing=missing)


def rank(offers, user_skills: set[str]) -> list[Match]:
    """Toutes les offres, de la plus proche à la plus éloignée du profil."""
    matches = [match_offer(o, user_skills) for o in offers]
    matches.sort(key=lambda m: (-m.score, -len(m.covered), m.offer.title))
    return matches


def coverage(matches: list[Match]) -> tuple[int, bool]:
    """(nombre d'offres proches, faut-il chercher d'autres offres ?)"""
    strong = sum(1 for m in matches if m.score >= STRONG_SCORE)
    return strong, strong < MIN_STRONG_OFFERS
