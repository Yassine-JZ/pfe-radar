import strawberry
from graphql import GraphQLError
from sqlalchemy import select
from strawberry.types import Info

from ..models import Offer, SavedOffer
from .context import Context, require_user
from .offer_types import OfferType


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
        skills=list(o.skills),
        apply_url=o.apply_url,
        published_at=o.published_at,
        deadline=o.deadline,
        source=o.source,
        created_by_id=o.created_by_id,
    )


@strawberry.type
class SavedOffersQuery:
    @strawberry.field
    def saved_offers(self, info: Info[Context, None]) -> list[OfferType]:
        require_user(info)
        user = info.context.user
        rows = info.context.db.scalars(
            select(Offer)
            .join(SavedOffer, SavedOffer.offer_id == Offer.id)
            .where(SavedOffer.user_id == user.id)
            .order_by(SavedOffer.created_at.desc())
        ).all()
        return [to_offer_type(o) for o in rows]

    @strawberry.field
    def saved_offer_ids(self, info: Info[Context, None]) -> list[int]:
        require_user(info)
        user = info.context.user
        return list(
            info.context.db.scalars(
                select(SavedOffer.offer_id).where(SavedOffer.user_id == user.id)
            ).all()
        )


@strawberry.type
class SavedOffersMutation:
    @strawberry.mutation
    def toggle_save_offer(self, info: Info[Context, None], offer_id: int) -> bool:
        """Sauvegarde l'offre, ou la retire si elle l'est déjà.
        Renvoie True si l'offre est sauvegardée après l'appel."""
        require_user(info)
        user = info.context.user
        db = info.context.db

        if db.get(Offer, offer_id) is None:
            raise GraphQLError("Offre introuvable")

        existing = db.scalar(
            select(SavedOffer).where(
                SavedOffer.user_id == user.id, SavedOffer.offer_id == offer_id
            )
        )
        if existing is not None:
            db.delete(existing)
            db.commit()
            return False

        db.add(SavedOffer(user_id=user.id, offer_id=offer_id))
        db.commit()
        return True