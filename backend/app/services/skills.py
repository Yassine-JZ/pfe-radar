import json
import re
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "competences.json"


@lru_cache
def load_referential() -> list[dict]:
    return json.loads(DATA.read_text(encoding="utf-8"))


def _pattern(term: str) -> re.Pattern:
    # Le terme doit être isolé : "Java" ne doit pas matcher dans "JavaScript",
    # ni "SQL" dans "PostgreSQL", ni "js" dans "Node.js".
    parts = [re.escape(p) for p in term.split()]
    body = r"\s+".join(parts)
    return re.compile(r"(?<![A-Za-z0-9+#.])" + body + r"(?![A-Za-z0-9+#])", re.IGNORECASE)


@lru_cache
def _compiled() -> list[tuple[dict, list[re.Pattern]]]:
    result = []
    for skill in load_referential():
        terms = [skill["name"], *skill.get("aliases", [])]
        result.append((skill, [_pattern(t) for t in terms]))
    return result


def _public(skill: dict) -> dict:
    return {"name": skill["name"], "domain": skill["domain"], "core": skill["core"]}


def detect_skills(text: str) -> list[dict]:
    return [_public(skill) for skill, patterns in _compiled() if any(p.search(text) for p in patterns)]


def skills_by_names(names: list[str]) -> list[dict]:
    by_name = {s["name"]: s for s in load_referential()}
    seen: set[str] = set()
    result = []
    for name in names:
        skill = by_name.get(name)
        if skill and name not in seen:
            seen.add(name)
            result.append(_public(skill))
    return result


def catalog() -> list[dict]:
    return sorted((_public(s) for s in load_referential()), key=lambda s: s["name"].lower())    