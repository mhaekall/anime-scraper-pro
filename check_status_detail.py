import asyncio
import os
import sys
import json

sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))
from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

async def main():
    db = Database(db_url)
    await db.connect()
    
    print("--- Episodes for Tensura S1 Ep 1 ---")
    rows = await db.fetch_all('SELECT "providerId", "episodeUrl" FROM episodes WHERE "anilistId" = 101280 AND "episodeNumber" = 1.0')
    for r in rows:
        print(dict(r))
        # Check if this URL exists in video_cache
        cache_row = await db.fetch_one('SELECT "episodeUrl", "providerId", "expiresAt" FROM video_cache WHERE "episodeUrl" = :url', values={"url": r["episodeUrl"]})
        print(f"  Cache entry exists: {cache_row is not None}")
        if cache_row:
            print(f"  Cache details: {dict(cache_row)}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
