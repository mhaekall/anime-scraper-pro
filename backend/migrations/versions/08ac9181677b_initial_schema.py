"""initial_schema

Revision ID: 08ac9181677b
Revises: 
Create Date: 2026-04-08 22:00:29.421942

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '08ac9181677b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    statements = [
        """
        CREATE TABLE IF NOT EXISTS episodes (
            id              SERIAL PRIMARY KEY,
            "anilistId"     INTEGER NOT NULL REFERENCES anime_metadata("anilistId") ON DELETE CASCADE,
            "providerId"    TEXT    NOT NULL,
            "episodeNumber" FLOAT   NOT NULL,
            "episodeTitle"  TEXT,
            "episodeUrl"    TEXT    NOT NULL,
            "thumbnailUrl"  TEXT,
            "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_episode_provider_num UNIQUE ("anilistId", "providerId", "episodeNumber")
        )
        """,
        'CREATE INDEX IF NOT EXISTS idx_episodes_anilist_num ON episodes ("anilistId", "episodeNumber")',
        'CREATE INDEX IF NOT EXISTS idx_episodes_provider    ON episodes ("providerId", "anilistId")',
        """
        CREATE TABLE IF NOT EXISTS video_cache (
            id           SERIAL PRIMARY KEY,
            "episodeUrl" TEXT      NOT NULL UNIQUE,
            "providerId" TEXT      NOT NULL,
            payload      JSONB     NOT NULL,
            "expiresAt"  TIMESTAMP NOT NULL,
            "updatedAt"  TIMESTAMP NOT NULL DEFAULT NOW()
        )
        """,
        'CREATE INDEX IF NOT EXISTS idx_video_cache_url     ON video_cache ("episodeUrl")',
        'CREATE INDEX IF NOT EXISTS idx_video_cache_expires ON video_cache ("expiresAt")',
        'CREATE INDEX IF NOT EXISTS idx_user_bookmarks_anilist_id ON user_bookmarks ("anilistId")',
        'CREATE INDEX IF NOT EXISTS idx_watch_history_anilist_id ON watch_history ("anilistId")',
        """
        ALTER TABLE anime_metadata 
          ADD COLUMN IF NOT EXISTS "lockVersion" INTEGER NOT NULL DEFAULT 0
        """,
        """
        CREATE OR REPLACE FUNCTION upsert_mapping_atomic(
          p_anilist_id    INTEGER,
          p_provider_id   TEXT,
          p_provider_slug TEXT,
          p_clean_title   TEXT,
          p_cover_image   TEXT
        ) RETURNS VOID AS $$
        BEGIN
          PERFORM pg_advisory_xact_lock(p_anilist_id);
          
          INSERT INTO anime_metadata ("anilistId", "cleanTitle", "coverImage", "updatedAt")
          VALUES (p_anilist_id, p_clean_title, p_cover_image, NOW())
          ON CONFLICT ("anilistId") DO UPDATE SET
            "cleanTitle" = EXCLUDED."cleanTitle",
            "updatedAt"  = NOW();

          INSERT INTO anime_mappings ("anilistId", "providerId", "providerSlug", "updatedAt")
          VALUES (p_anilist_id, p_provider_id, p_provider_slug, NOW())
          ON CONFLICT ("providerId", "providerSlug") DO UPDATE SET
            "anilistId" = EXCLUDED."anilistId",
            "updatedAt" = NOW();
        END;
        $$ LANGUAGE plpgsql;
        """,
    ]
    for stmt in statements:
        try:
            op.execute(stmt)
        except Exception as e:
            print(f"Warning during migration: {e}")


def downgrade() -> None:
    """Downgrade schema."""
    pass
