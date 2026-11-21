import strawberry
from strawberry.types import Info

from .context import Context
from .types import UserType


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


schema = strawberry.Schema(query=Query)