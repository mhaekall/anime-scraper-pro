import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.connection import database
from services.background import background_scrape_job
from routes import home, anime, stream, catalog, home_v2, stream_v2, webhook

import os

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://anime-scraper-pro.pages.dev")


async def run_migrations():
    """
    Ensure new tables exist.  Safe to run on every startup — uses IF NOT EXISTS.
    In production, replace this with a proper Alembic migration.
    """
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
            await database.execute(stmt)
        except Exception as e:
            # Table/index already exists — ignore
            if "already exists" not in str(e).lower():
                print(f"[Migration] Warning: {e}")

    print("[Migration] Schema up to date.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to DB
    retries = 3
    for i in range(retries):
        try:
            await database.connect()
            print("[DB] Connected to Neon DB")
            break
        except Exception as e:
            print(f"[DB] Connection failed ({i+1}/{retries}): {e}")
            await asyncio.sleep(2)
    else:
        print("[DB] Failed to connect after retries — starting without DB")

    # Run migrations for new tables
    try:
        await run_migrations()
    except Exception as e:
        print(f"[Migration] Error: {e}")

    # Start background scrape job
    task = asyncio.create_task(background_scrape_job())

    yield

    task.cancel()
    try:
        await database.disconnect()
        print("[DB] Disconnected")
    except Exception as e:
        print(f"[DB] Error disconnecting: {e}")


app = FastAPI(
    title="Anime Platform API",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ALLOWED_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# v1 routes (kept for backward compatibility)
app.include_router(home.router,    prefix="/api",    tags=["Home"])
app.include_router(anime.router,   prefix="/api",    tags=["Anime"])
app.include_router(stream.router,  prefix="/api",    tags=["Stream"])

# v2 routes — use these for all new frontend code
app.include_router(catalog.router, prefix="/api",    tags=["Catalog v2"])
app.include_router(home_v2.router, prefix="/api",    tags=["Home v2"])
app.include_router(stream_v2.router, prefix="/api/v2", tags=["v2"])
app.include_router(webhook.router, prefix="/api/v2", tags=["Webhook"])


@app.get("/healthz", tags=["System"])
async def health():
    db_ok = False
    try:
        await database.fetch_one("SELECT 1")
        db_ok = True
    except Exception:
        pass
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}
