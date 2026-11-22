import strawberry
from graphql import GraphQLError
from strawberry.types import Info

from ..services.profile import domain_scores
from ..services.skills import catalog, detect_skills, skills_by_names
from .context import Context, require_user
from .types import AnalysisType, DomainScoreType, SkillType, UserType

MAX_TEXT = 60_000


@strawberry.type
class Query:
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


schema = strawberry.Schema(query=Query)