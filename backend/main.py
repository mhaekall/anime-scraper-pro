import asyncio
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from db.connection import database
from services.background import background_scrape_job
from routes import home, anime, stream, catalog, home_v2, stream_v2, webhook

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://anime-scraper-pro.pages.dev")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to DB with robust retry for Neon cold-starts
    retries = 10
    for i in range(retries):
        try:
            await database.connect()
            print(f"[DB] Connected to Neon DB (attempt {i+1})")
            # Auto-migrate columns
            try:
                await database.execute('ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS "popularity" INTEGER DEFAULT 0')
                await database.execute('ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS "trending" INTEGER DEFAULT 0')
            except Exception as e:
                print(f"[DB] Auto-migration error: {e}")
            break
        except Exception as e:
            print(f"[DB] Connection attempt {i+1} failed: {e}")
            await asyncio.sleep(5)
    else:
        print("[DB] CRITICAL: Failed to connect to database after all retries")

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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"GLOBAL ERROR: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": str(exc), "trace": traceback.format_exc()},
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
app.include_router(social.router, prefix="/api/v2/social", tags=["Social"])


@app.post("/admin/sync-popular", tags=["Admin"])
async def trigger_popular_sync(background_tasks: BackgroundTasks):
    from scripts.sync_popular import sync_popular_anime
    background_tasks.add_task(sync_popular_anime)
    return {"success": True, "message": "Popular anime sync started in background"}


@app.post("/admin/resync-missing", tags=["Admin"])
async def trigger_resync_missing(background_tasks: BackgroundTasks):
    from scripts.resync_missing import resync_missing_episodes
    background_tasks.add_task(resync_missing_episodes)
    return {"success": True, "message": "Resync missing episodes started in background"}


@app.get("/debug/columns/{table_name}", tags=["Debug"])
async def get_columns(table_name: str):
    try:
        rows = await database.fetch_all(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = :table_name
        """, values={"table_name": table_name})
        return {"columns": [dict(r) for r in rows]}
    except Exception as e:
        return {"error": str(e)}


@app.get("/healthz", tags=["System"])
async def health():
    db_ok = False
    try:
        await database.fetch_one("SELECT 1")
        db_ok = True
    except Exception:
        pass
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}
