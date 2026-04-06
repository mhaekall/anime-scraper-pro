import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.connection import database
from services.background import background_scrape_job

from routes import home, anime, stream

@asynccontextmanager
async def lifespan(app: FastAPI):
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
        print("[DB] Failed to connect to Neon DB after retries")
        
    task = asyncio.create_task(background_scrape_job())
    yield
    task.cancel()
    try:
        await database.disconnect()
        print("[DB] Disconnected from Neon DB")
    except Exception as e:
        print(f"[DB] Error disconnecting: {e}")

app = FastAPI(title="Anime Scraper API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(home.router, prefix="/api", tags=["Home"])
app.include_router(anime.router, prefix="/api", tags=["Anime"])
app.include_router(stream.router, prefix="/api", tags=["Stream"])
