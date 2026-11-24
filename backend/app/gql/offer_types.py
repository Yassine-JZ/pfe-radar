from datetime import date

import strawberry


@strawberry.type
class OfferType:
    id: int
    title: str
    company: str
    city: str
    latitude: float
    longitude: float
    type: str
    domain: str
    description: str
    skills: list[str]
    apply_url: str | None
    published_at: date
    deadline: date | None
    source: str
    created_by_id: int | None


@strawberry.type
class OfferPageType:
    items: list[OfferType]
    total: int
    page: int
    page_size: int
    total_pages: int