from datetime import date

import strawberry


@strawberry.type
class UserType:
    id: int
    full_name: str
    email: str


@strawberry.type
class SkillType:
    name: str
    domain: str
    core: bool


@strawberry.type
class DomainScoreType:
    domain: str
    score: int


@strawberry.type
class AnalysisType:
    skills: list[SkillType]
    domains: list[DomainScoreType]


@strawberry.type
class MatchType:
    id: int
    title: str
    company: str
    city: str
    domain: str
    type: str
    latitude: float
    longitude: float
    score: int
    covered: list[str]
    missing: list[str]
    apply_url: str | None
    deadline: date | None
    source: str


@strawberry.type
class MatchResultType:
    offers: list[MatchType]  # les meilleures offres (limitées)
    total: int  # offres comparées (hors offres expirées)
    strong: int  # offres avec un score >= 40
    needs_more: bool  # trop peu d'offres proches : il faudrait en chercher d'autres
