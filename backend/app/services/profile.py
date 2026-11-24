from .skills import load_referential

DOMAINS = ["Data", "IA / ML", "Web", "DevOps", "Mobile"]
CORE_WEIGHT = 2
OTHER_WEIGHT = 1


def domain_scores(detected: set[str]) -> list[dict]:
    """Score d'un domaine = poids des compétences trouvées / poids total du domaine.

    Une compétence clé compte double. Le score est donc relatif au référentiel :
    explicable devant un jury.
    """
    total = {d: 0 for d in DOMAINS}
    found = {d: 0 for d in DOMAINS}
    for skill in load_referential():
        weight = CORE_WEIGHT if skill["core"] else OTHER_WEIGHT
        total[skill["domain"]] += weight
        if skill["name"] in detected:
            found[skill["domain"]] += weight
    return [
        {"domain": d, "score": round(100 * found[d] / total[d]) if total[d] else 0}
        for d in DOMAINS
    ]