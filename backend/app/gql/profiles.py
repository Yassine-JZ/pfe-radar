import strawberry
from graphql import GraphQLError
from sqlalchemy import func, select
from strawberry.types import Info

from ..models import SavedProfile
from ..services.skills import skills_by_names
from .context import Context, require_user
from .types import SavedProfileType

MAX_SAVED = 20


def to_type(p: SavedProfile) -> SavedProfileType:
    return SavedProfileType(
        id=p.id, name=p.name, skills=list(p.skills), created_at=p.created_at
    )


@strawberry.type
class ProfilesQuery:
    @strawberry.field
    def saved_profiles(self, info: Info[Context, None]) -> list[SavedProfileType]:
        require_user(info)
        user = info.context.user
        rows = info.context.db.scalars(
            select(SavedProfile)
            .where(SavedProfile.user_id == user.id)
            .order_by(SavedProfile.created_at.desc())
        ).all()
        return [to_type(p) for p in rows]


@strawberry.type
class ProfilesMutation:
    @strawberry.mutation
    def save_profile(
        self, info: Info[Context, None], name: str, skills: list[str]
    ) -> SavedProfileType:
        require_user(info)
        user = info.context.user
        db = info.context.db

        name = name.strip()
        if not name:
            raise GraphQLError("Nom du profil manquant")
        if len(name) > 100:
            raise GraphQLError("Nom du profil trop long")

        names = [s["name"] for s in skills_by_names(skills)]
        if not names:
            raise GraphQLError("Aucune compétence à sauvegarder")

        count = db.scalar(
            select(func.count())
            .select_from(SavedProfile)
            .where(SavedProfile.user_id == user.id)
        )
        if count >= MAX_SAVED:
            raise GraphQLError("Limite de profils sauvegardés atteinte")

        profile = SavedProfile(user_id=user.id, name=name, skills=names)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return to_type(profile)

    @strawberry.mutation
    def delete_saved_profile(self, info: Info[Context, None], id: int) -> bool:
        require_user(info)
        user = info.context.user
        db = info.context.db

        profile = db.get(SavedProfile, id)
        if profile is None or profile.user_id != user.id:
            raise GraphQLError("Profil introuvable")
        db.delete(profile)
        db.commit()
        return True