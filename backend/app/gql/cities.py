import json
from pathlib import Path

import strawberry
from strawberry.types import Info

from .context import Context, require_user

VILLES = Path(__file__).resolve().parent.parent / "data" / "villes.json"


@strawberry.type
class CityType:
    name: str
    latitude: float
    longitude: float


@strawberry.type
class CitiesQuery:
    @strawberry.field
    def cities(self, info: Info[Context, None]) -> list[CityType]:
        """Villes tunisiennes (nom + coordonnées), lues dans villes.json."""
        require_user(info)
        data = json.loads(VILLES.read_text(encoding="utf-8"))
        return [
            CityType(name=c["name"], latitude=c["latitude"], longitude=c["longitude"])
            for c in data
        ]