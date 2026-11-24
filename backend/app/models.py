from datetime import date, datetime, timezone

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Offer(Base):
    __tablename__ = "offers"
    # Une même offre ne peut exister qu'une fois par source (évite les doublons
    # quand on relance le seed ou un import externe). NULL est permis pour
    # external_id : les offres saisies à la main n'en ont pas.
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_offers_source_external_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200), index=True)
    company: Mapped[str] = mapped_column(String(150))
    city: Mapped[str] = mapped_column(String(100), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    type: Mapped[str] = mapped_column(String(30), index=True)
    domain: Mapped[str] = mapped_column(String(30), index=True)
    description: Mapped[str] = mapped_column(Text)
    skills: Mapped[list[str]] = mapped_column(ARRAY(String(60)), default=list)
    apply_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published_at: Mapped[date] = mapped_column(Date, default=date.today)
    # Date limite de candidature : permet de masquer les offres expirées.
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    # Origine de l'offre : "seed" (fichier offres_seed.json), plus tard "jsearch", etc.
    source: Mapped[str] = mapped_column(String(30), default="seed", index=True)
    # Identifiant de l'offre chez la source (sert à éviter les doublons).
    external_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # Dernière fois que l'offre a été chargée/rafraîchie (âge du cache).
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

class SavedProfile(Base):
    __tablename__ = "saved_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    skills: Mapped[list[str]] = mapped_column(ARRAY(String(60)), default=list)
    domains: Mapped[list] = mapped_column(JSON, default=list)
    top_offers: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

class SavedOffer(Base):
    __tablename__ = "saved_offers"
    __table_args__ = (
        UniqueConstraint("user_id", "offer_id", name="uq_saved_offers_user_offer"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("offers.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )