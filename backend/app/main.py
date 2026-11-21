from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter

from . import models  # noqa: F401  (enregistre les tables)
from .config import CORS_ORIGINS
from .database import Base, engine
from .gql.context import get_context
from .gql.schema import schema
from .routers import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="PFE Radar API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(
    GraphQLRouter(schema, context_getter=get_context), prefix="/graphql"
)


@app.get("/health")
def health():
    return {"status": "ok"}