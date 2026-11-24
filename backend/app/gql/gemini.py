import json
import logging
import os
import time
import urllib.error
import urllib.request

from graphql import GraphQLError

log = logging.getLogger(__name__)

MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")
FALLBACK_MODELS = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite"]
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
MAX_WAIT = 60  # secondes au maximum pour toute la demande
BUSY_MESSAGE = "Gemini est surchargé en ce moment, réessaie dans quelques instants"


class _Busy(Exception):
    """Gemini est surchargé ou a un souci temporaire : on peut réessayer."""


class _Missing(Exception):
    """Ce nom de modèle n'existe pas pour cette clé : on passe au suivant."""


def _post(model: str, data: bytes, key: str) -> dict:
    request = urllib.request.Request(
        f"{BASE_URL}/{model}:generateContent",
        data=data,
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            return json.load(response)
    except urllib.error.HTTPError as err:
        log.warning("Gemini HTTP %s (%s) : %s", err.code, model, err.read()[:200])
        if err.code == 404:
            raise _Missing()
        if err.code in (429, 500, 502, 503, 504):
            raise _Busy()
        if err.code in (401, 403):
            raise GraphQLError("Clé Gemini refusée, vérifie GEMINI_API_KEY")
        raise GraphQLError("La génération IA a échoué")
    except (urllib.error.URLError, TimeoutError) as err:
        log.warning("Gemini réseau (%s) : %s", model, err)
        raise _Busy()


def _text_of(payload: dict) -> str:
    try:
        parts = payload["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError):
        parts = []
    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict)).strip()
    if not text:
        log.warning("Réponse Gemini vide : %s", str(payload)[:300])
        raise GraphQLError("Réponse IA vide, réessaie")
    return text


def generate(
    system: str,
    user_text: str,
    *,
    json_output: bool = False,
    max_tokens: int = 4096,
    temperature: float = 0.3,
) -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    if not key:
        raise GraphQLError("L'IA n'est pas configurée")

    config = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if json_output:
        config["responseMimeType"] = "application/json"
    data = json.dumps(
        {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user_text}]}],
            "generationConfig": config,
        }
    ).encode("utf-8")

    models = []
    for name in (MODEL, *FALLBACK_MODELS):
        if name not in models:
            models.append(name)

    started = time.monotonic()
    for model in models:
        for _attempt in range(2):
            if time.monotonic() - started > MAX_WAIT:
                raise GraphQLError(BUSY_MESSAGE)
            try:
                return _text_of(_post(model, data, key))
            except _Missing:
                break
            except _Busy:
                time.sleep(1)
    raise GraphQLError(BUSY_MESSAGE)


def generate_json(system: str, user_text: str, max_tokens: int = 4096) -> dict:
    text = generate(
        system, user_text, json_output=True, max_tokens=max_tokens, temperature=0
    )
    if text.startswith("```"):
        text = text.strip("`").removeprefix("json").strip()
    try:
        data = json.loads(text)
    except ValueError:
        log.warning("JSON Gemini illisible : %s", text[:300])
        raise GraphQLError("Réponse IA illisible, réessaie")
    if not isinstance(data, dict):
        raise GraphQLError("Réponse IA illisible, réessaie")
    return data