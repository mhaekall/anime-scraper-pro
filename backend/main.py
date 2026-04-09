import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.connection import database
from services.background import background_scrape_job
from routes import home, anime, stream, catalog, home_v2, stream_v2, webhook

import os

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://anime-scraper-pro.pages.dev")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to DB
    retries = 3
    for i in range(retries):
        try:
            await database.connect()
            print("[DB] Connected to Neon DB")
            # Auto-migrate columns for popular/trending
            try:
                await database.execute('ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS "popularity" INTEGER DEFAULT 0')
                await database.execute('ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS "trending" INTEGER DEFAULT 0')
            except Exception as e:
                print(f"[DB] Auto-migration error: {e}")
            break
        except Exception as e:
            print(f"[DB] Connection failed ({i+1}/{retries}): {e}")
            await asyncio.sleep(2)
    else:
        print("[DB] Failed to connect after retries — starting without DB")

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
