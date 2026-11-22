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