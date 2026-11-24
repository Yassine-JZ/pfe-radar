import re
import unicodedata
from io import BytesIO

import pdfplumber

MAX_PAGES = 5
MIN_TEXT_LENGTH = 80

SECTION_ALIASES = {
    "formation": ["formation", "formations", "education", "etudes", "parcours academique", "diplomes"],
    "experience": [
        "experience", "experiences", "experience professionnelle",
        "experiences professionnelles", "stages", "stage", "work experience",
    ],
    "competences": ["competences", "competences techniques", "skills", "technical skills", "technologies", "outils"],
    "projets": ["projets", "projets academiques", "projects"],
    "langues": ["langues", "languages"],
}

_LEVEL = re.compile(
    r"(licence|master|mast[eè]re|ing[ée]nieur|bachelor|cycle pr[ée]paratoire|doctorat)",
    re.IGNORECASE,
)


class CvError(ValueError):
    """Erreur lisible par l'utilisateur."""


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


_HEADINGS = {_norm(alias): key for key, aliases in SECTION_ALIASES.items() for alias in aliases}


def extract_text(data: bytes) -> str:
    try:
        with pdfplumber.open(BytesIO(data)) as pdf:
            if len(pdf.pages) > MAX_PAGES:
                raise CvError(
                    f"Ce document a {len(pdf.pages)} pages : un CV fait généralement 1 à {MAX_PAGES} pages."
                )
            pages = [(page.extract_text() or "") for page in pdf.pages]
    except CvError:
        raise
    except Exception as exc:
        raise CvError("Fichier PDF illisible") from exc

    text = "\n".join(pages).replace("\x00", "").strip()
    if len(text) < MIN_TEXT_LENGTH:
        raise CvError(
            "Aucun texte exploitable : le PDF semble être une image scannée. "
            "Utilise un PDF dont le texte est sélectionnable."
        )
    return text


def detect_sections(text: str) -> dict[str, str]:
    sections: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        key = _HEADINGS.get(_norm(line)) if len(line) <= 40 else None
        if key:
            current = key
            sections.setdefault(key, [])
        elif current and line.strip():
            sections[current].append(line.strip())
    return {key: "\n".join(lines) for key, lines in sections.items() if lines}


def detect_level(text: str) -> str | None:
    for line in text.splitlines():
        if _LEVEL.search(line):
            return line.strip()[:80]
    return None