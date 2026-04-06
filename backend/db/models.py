from sqlalchemy import Table, Column, Integer, String, Text, Boolean, DateTime, JSON, MetaData, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from .connection import metadata

anime_metadata = Table(
    "anime_metadata",
    metadata,
    Column("anilistId", Integer, primary_key=True),
    Column("cleanTitle", Text, nullable=False),
    Column("nativeTitle", Text),
    Column("coverImage", Text),
    Column("bannerImage", Text),
    Column("synopsis", Text),
    Column("score", Integer),
    Column("status", Text),
    Column("totalEpisodes", Integer),
    Column("season", Text),
    Column("year", Integer),
    Column("studios", JSON),
    Column("genres", JSON),
    Column("recommendations", JSON),
    Column("nextAiringEpisode", JSON),
    Column("updatedAt", DateTime, nullable=False, server_default=func.now(), onupdate=func.now()),
)

anime_mappings = Table(
    "anime_mappings",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("anilistId", Integer, ForeignKey("anime_metadata.anilistId", ondelete="CASCADE"), nullable=False),
    Column("providerId", Text, nullable=False),
    Column("providerSlug", Text, nullable=False),
    Column("updatedAt", DateTime, nullable=False, server_default=func.now(), onupdate=func.now()),
    UniqueConstraint("providerId", "providerSlug", name="anime_mappings_providerId_providerSlug_key"),
)
