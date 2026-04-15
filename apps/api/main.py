from routes import webhook
import asyncio
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response, BackgroundTasks, Header, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from db.connection import database
from services.background import background_scrape_job
from routes import home, anime, stream, catalog, home_v2, stream_v2, webhook, social, db

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "https://anime-scraper-pro.pages.dev")

async def verify_admin_key(x_admin_key: str = Header(None)):
    expected_key = os.getenv("ADMIN_API_KEY")
    if not expected_key:
        return
    if not x_admin_key or x_admin_key != expected_key:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin Key")


db_connection_error = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_connection_error
    # Connect to DB with robust retry for Neon cold-starts
    retries = 10
    for i in range(retries):
        try:
            await database.connect()
            print(f"[DB] Connected to Neon DB (attempt {i+1})")
            db_connection_error = None
            
            # Run migrations after successful connection
            try:
                print("[DB] Running SQLAlchemy async create_all as fallback for missing tables...")
                from db.connection import metadata
                from db.models import users, comments, comment_reactions, follows, notifications, watch_events
                from sqlalchemy.ext.asyncio import create_async_engine
                import os
                db_url = os.getenv("DATABASE_URL")
                if db_url and db_url.startswith("postgresql://"):
                    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
                if db_url and "?sslmode=" in db_url:
                    db_url = db_url.split("?sslmode=")[0]
                if db_url:
                    engine = create_async_engine(db_url)
                    async with engine.begin() as conn:
                        await conn.run_sync(metadata.create_all)
                    print("[DB] Missing tables created successfully via async metadata.")
            except Exception as e:
                import traceback
                print(f"[DB] Table creation fallback failed: {e}")
                traceback.print_exc()
                
            break
        except Exception as e:
            db_connection_error = str(e)
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


class DatabaseReconnectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            err_str = str(exc)
            if "DatabaseBackend is not running" in err_str or "connection" in err_str.lower() or "pool" in err_str.lower() or "closed" in err_str.lower():
                print(f"[DB Middleware] Connection lost: {exc}. Reconnecting...")
                try:
                    await database.disconnect()
                except:
                    pass
                try:
                    await database.connect()
                    print("[DB Middleware] Reconnected successfully.")
                    return await call_next(request)
                except Exception as reconnect_exc:
                    print(f"[DB Middleware] Reconnect failed: {reconnect_exc}")
            raise exc

app = FastAPI(
    title="Anime Platform API",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(DatabaseReconnectMiddleware)

@app.get("/api/v2/admin/cache-stats", dependencies=[Depends(verify_admin_key)])
async def cache_stats():
    from services.stream_cache import cache_stats_handler
    return await cache_stats_handler()

@app.get("/api/v2/admin/ingest-stats", dependencies=[Depends(verify_admin_key)])
async def ingest_stats():
    import json
    from services.clients import client
    from services.config import UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
    
    headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
    tasks = []
    try:
        # Scan for ingest_progress keys
        scan_url = f"{UPSTASH_REDIS_REST_URL}/scan/0?MATCH=ingest_progress:*&COUNT=100"
        res = await client.get(scan_url, headers=headers)
        data = res.json()
        if data.get('result'):
            cursor, keys = data['result']
            if keys:
                # MGET all keys
                mget_url = f"{UPSTASH_REDIS_REST_URL}/mget"
                payload = json.dumps(keys)
                mget_res = await client.post(mget_url, headers=headers, data=payload)
                mget_data = mget_res.json()
                if mget_data.get('result'):
                    values = mget_data['result']
                    for i, key in enumerate(keys):
                        # key format: ingest_progress:{anilist_id}:{ep_num}
                        parts = key.split(':')
                        if len(parts) >= 3:
                            val = values[i]
                            # Handle string progress or JSON dict
                            status = val
                            if isinstance(val, str) and val.startswith('{'):
                                try:
                                    status = json.loads(val)
                                except:
                                    pass
                            tasks.append({
                                "anilist_id": parts[1],
                                "episode": parts[2],
                                "progress": status
                            })
        return {"success": True, "active_tasks": tasks}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e), "active_tasks": []}

@app.get("/api/v2/admin/force-db-setup", dependencies=[Depends(verify_admin_key)])
async def force_db_setup():
    try:
        from db.connection import metadata
        from db.models import users, comments, comment_reactions, follows, notifications, watch_events
        from sqlalchemy.ext.asyncio import create_async_engine
        import os
        db_url = os.getenv("DATABASE_URL")
        if db_url and db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if db_url and "?sslmode=" in db_url:
            db_url = db_url.split("?sslmode=")[0]
        if not db_url:
            return {"error": "DATABASE_URL is missing"}
        engine = create_async_engine(db_url)
        async with engine.begin() as conn:
            await conn.run_sync(metadata.create_all)
        return {"success": True, "message": "Tables created successfully"}
    except Exception as e:
        import traceback
        return {"success": False, "error": str(e), "traceback": traceback.format_exc()}

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
app.include_router(db.router,      prefix="/api/v1/db", tags=["Database"])

# v2 routes — use these for all new frontend code
app.include_router(catalog.router, prefix="/api",    tags=["Catalog v2"])
app.include_router(home_v2.router, prefix="/api",    tags=["Home v2"])
app.include_router(stream_v2.router, prefix="/api/v2", tags=["v2"])
app.include_router(webhook.router, prefix="/api/v2", tags=["Webhook"])
app.include_router(social.router, prefix="/api/v2/social", tags=["Social"])


@app.post("/admin/sync-popular", tags=["Admin"], dependencies=[Depends(verify_admin_key)])
async def trigger_popular_sync(background_tasks: BackgroundTasks):
    from scripts.sync_popular import sync_popular_anime
    background_tasks.add_task(sync_popular_anime)
    return {"success": True, "message": "Popular anime sync started in background"}


@app.post("/admin/resync-missing", tags=["Admin"], dependencies=[Depends(verify_admin_key)])
async def trigger_resync_missing(background_tasks: BackgroundTasks):
    from scripts.resync_missing import resync_missing_episodes
    background_tasks.add_task(resync_missing_episodes)
    return {"success": True, "message": "Resync missing episodes started in background"}


@app.get("/debug/columns/{table_name}", tags=["Debug"], dependencies=[Depends(verify_admin_key)])
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

@app.head("/healthz", tags=["System"])
@app.get("/healthz", tags=["System"])
async def health():
    global db_connection_error
    db_ok = False
    error_msg = None
    try:
        await database.fetch_one("SELECT 1")
        db_ok = True
    except Exception as e:
        error_msg = str(e)
        import traceback
        error_msg += "\\n" + traceback.format_exc()
    return {"status": "ok" if db_ok else "degraded", "db": db_ok, "error": error_msg, "startup_error": db_connection_error}
