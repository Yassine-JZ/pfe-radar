"""Test jetable JSearch.

    docker compose exec backend python test_jsearch.py            (2 requêtes, affiche un résumé)
    docker compose exec backend python test_jsearch.py --save     (1 requête, écrit jsearch_sample.json)

Le plan gratuit offre 200 requêtes par mois. Supprime ce fichier après le test.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

KEY = os.environ.get("RAPIDAPI_KEY", "")
HOST = "jsearch.p.rapidapi.com"
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
SAVE = "--save" in sys.argv
PATH = ARGS[0] if ARGS else "/search-v2"
QUERIES = [
    "stage PFE informatique Tunisie",
    "software developer internship Tunis",
]


def search(query: str):
    params = urllib.parse.urlencode({"query": query, "num_pages": 1, "country": "tn"})
    request = urllib.request.Request(
        f"https://{HOST}{PATH}?{params}",
        headers={"X-RapidAPI-Key": KEY, "X-RapidAPI-Host": HOST},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response), dict(response.headers)


def extract_jobs(payload):
    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("jobs", "results", "items"):
            if isinstance(data.get(key), list):
                return data[key]
    return []


def main():
    if not KEY:
        print("RAPIDAPI_KEY est vide dans le container.")
        print("Vérifie le .env puis : docker compose up -d --force-recreate backend")
        return
    print(f"Clé trouvée ({len(KEY)} caractères). Chemin testé : {PATH}")

    for query in QUERIES[:1] if SAVE else QUERIES:
        print(f"\n=== {query} ===")
        try:
            payload, headers = search(query)
        except urllib.error.HTTPError as error:
            print(f"Erreur HTTP {error.code} : {error.read().decode('utf-8', 'replace')[:300]}")
            return
        except Exception as error:  # réseau, JSON invalide...
            print(f"Erreur : {error}")
            return

        remaining = headers.get("X-RateLimit-Requests-Remaining")
        print("Requêtes restantes ce mois-ci :", remaining if remaining else "non fourni")
        jobs = extract_jobs(payload)
        print(f"{len(jobs)} offre(s)")
        for job in jobs[:8]:
            print(
                " -",
                repr(job.get("job_title")),
                "| société:", repr(job.get("employer_name")),
                "| ville:", repr(job.get("job_city")),
                "| lieu:", repr(job.get("job_location")),
                "| pays:", repr(job.get("job_country")),
                "| date:", job.get("job_posted_at_datetime_utc"),
                "| type:", job.get("job_employment_type"),
                "| description:", len(job.get("job_description") or ""), "car.",
            )

        if SAVE:
            with open("jsearch_sample.json", "w", encoding="utf-8") as f:
                json.dump(jobs, f, ensure_ascii=False, indent=2)
            print(f"\nÉcrit : jsearch_sample.json ({len(jobs)} offres). ")


if __name__ == "__main__":
    main()