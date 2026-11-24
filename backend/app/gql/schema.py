from datetime import date
from .offers import OffersQuery
from .ai_search import AiSearchQuery
from .cities import CitiesQuery
import strawberry
from graphql import GraphQLError
from sqlalchemy import or_, select
from strawberry.types import Info
from .profiles import ProfilesMutation, ProfilesQuery
from .saved_offers import SavedOffersMutation, SavedOffersQuery

from ..models import Offer
from ..services.matching import coverage, rank
from ..services.profile import domain_scores
from ..services.skills import catalog, detect_skills, skills_by_names
from .context import Context, require_user
from .types import (
    AnalysisType,
    DomainScoreType,
    MatchResultType,
    MatchType,
    SkillType,
    UserType,
)

MAX_TEXT = 60_000
MAX_OFFERS = 20


@strawberry.type
class Query(OffersQuery, CitiesQuery, ProfilesQuery, SavedOffersQuery, AiSearchQuery):
    @strawberry.field
    def ping(self) -> str:
        return "pong"

    @strawberry.field
    def me(self, info: Info[Context, None]) -> UserType | None:
        user = info.context.user
        if user is None:
            return None
        return UserType(id=user.id, full_name=user.full_name, email=user.email)

    @strawberry.field
    def skill_catalog(self, info: Info[Context, None]) -> list[SkillType]:
        require_user(info)
        return [SkillType(**s) for s in catalog()]

    @strawberry.field
    def analysis(
        self,
        info: Info[Context, None],
        text: str | None = None,
        skills: list[str] | None = None,
    ) -> AnalysisType:
        """Avec `text` : détecte les compétences du CV.
        Avec `skills` : recalcule le profil à partir d'une liste corrigée."""
        require_user(info)
        if skills is None:
            if not text or not text.strip():
                raise GraphQLError("Texte du CV manquant")
            if len(text) > MAX_TEXT:
                raise GraphQLError("Texte du CV trop long")
            found = detect_skills(text)
        else:
            found = skills_by_names(skills)

        names = {s["name"] for s in found}
        return AnalysisType(
            skills=[SkillType(**s) for s in found],
            domains=[DomainScoreType(**d) for d in domain_scores(names)],
        )

    @strawberry.field
    def matches(
        self,
        info: Info[Context, None],
        skills: list[str],
        limit: int = 6,
    ) -> MatchResultType:
        """Classe les offres selon les compétences du CV (score = compétences
        requises couvertes / compétences requises). Les offres expirées sont ignorées."""
        require_user(info)
        limit = max(1, min(limit, MAX_OFFERS))
        user_skills = {s["name"] for s in skills_by_names(skills)}

        offers = info.context.db.scalars(
            select(Offer).where(
                or_(Offer.deadline.is_(None), Offer.deadline >= date.today())
            )
        ).all()

        ranked = rank(offers, user_skills)
        strong, needs_more = coverage(ranked)
        return MatchResultType(
            offers=[
                MatchType(
                    id=m.offer.id,
                    title=m.offer.title,
                    company=m.offer.company,
                    city=m.offer.city,
                    domain=m.offer.domain,
                    type=m.offer.type,
                    latitude=m.offer.latitude,
                    longitude=m.offer.longitude,
                    score=m.score,
                    covered=m.covered,
                    missing=m.missing,
                    apply_url=m.offer.apply_url,
                    deadline=m.offer.deadline,
                    source=m.offer.source,
                )
                for m in ranked[:limit]
            ],
            total=len(ranked),
            strong=strong,
            needs_more=needs_more,
        )


@strawberry.type
class Mutation(ProfilesMutation, SavedOffersMutation):
    pass


schema = strawberry.Schema(query=Query, mutation=Mutation)