import math
from datetime import date

import strawberry
from sqlalchemy import func, or_, select
from strawberry.types import Info

from ..models import Offer
from .context import Context, require_user
from .offer_types import OfferPageType, OfferType

MAX_PAGE_SIZE = 50
MAX_SEARCH = 100
ESCAPE = "\\"


def to_offer_type(o: Offer) -> OfferType:
    return OfferType(
        id=o.id,
        title=o.title,
        company=o.company,
        city=o.city,
        latitude=o.latitude,
        longitude=o.longitude,
        type=o.type,
        domain=o.domain,
        description=o.description,
        skills=list(o.skills or []),
        apply_url=o.apply_url,
        published_at=o.published_at,
        deadline=o.deadline,
        source=o.source,
        created_by_id=o.created_by_id,
    )


def like_pattern(term: str) -> str:
    escaped = (
        term.replace(ESCAPE, ESCAPE + ESCAPE)
        .replace("%", ESCAPE + "%")
        .replace("_", ESCAPE + "_")
    )
    return f"%{escaped}%"


@strawberry.type
class OffersQuery:
    @strawberry.field
    def offers(
        self,
        info: Info[Context, None],
        search: str | None = None,
        city: str | None = None,
        type: str | None = None,
        domain: str | None = None,
        page: int = 1,
        page_size: int = 10,
    ) -> OfferPageType:
        require_user(info)
        page = max(1, page)
        page_size = max(1, min(page_size, MAX_PAGE_SIZE))

        conditions = [or_(Offer.deadline.is_(None), Offer.deadline >= date.today())]
        if city:
            conditions.append(Offer.city == city)
        if type:
            conditions.append(Offer.type == type)
        if domain:
            conditions.append(Offer.domain == domain)
        if search:
            for term in search.strip()[:MAX_SEARCH].split():
                pattern = like_pattern(term)
                conditions.append(
                    or_(
                        Offer.title.ilike(pattern, escape=ESCAPE),
                        Offer.company.ilike(pattern, escape=ESCAPE),
                        Offer.description.ilike(pattern, escape=ESCAPE),
                        func.array_to_string(Offer.skills, " ").ilike(
                            pattern, escape=ESCAPE
                        ),
                    )
                )

        db = info.context.db
        total = db.scalar(select(func.count()).select_from(Offer).where(*conditions)) or 0
        rows = db.scalars(
            select(Offer)
            .where(*conditions)
            .order_by(Offer.published_at.desc(), Offer.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()

        return OfferPageType(
            items=[to_offer_type(o) for o in rows],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=max(1, math.ceil(total / page_size)),
        )

    @strawberry.field
    def offer(self, info: Info[Context, None], id: int) -> OfferType | None:
        require_user(info)
        found = info.context.db.get(Offer, id)
        return to_offer_type(found) if found else None