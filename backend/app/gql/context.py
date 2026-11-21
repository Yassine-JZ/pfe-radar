from fastapi import Depends
from graphql import GraphQLError
from sqlalchemy.orm import Session
from strawberry.fastapi import BaseContext

from ..database import get_db
from ..models import User
from ..security import get_optional_user


class Context(BaseContext):
    def __init__(self, db: Session, user: User | None):
        super().__init__()
        self.db = db
        self.user = user


def get_context(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> Context:
    return Context(db=db, user=user)


def require_user(info) -> User:
    """À utiliser dans les resolvers qui exigent une connexion."""
    user = info.context.user
    if user is None:
        raise GraphQLError("Non authentifié")
    return user