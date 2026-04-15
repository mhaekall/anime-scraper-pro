import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv(".env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

async def check():
    db = Database(db_url)
    await db.connect()
    
    query = """
      SELECT e."anilistId", e."episodeNumber", e."episodeUrl"
      FROM episodes e
      WHERE e."episodeUrl" LIKE '%tg-proxy%'
      ORDER BY e."updatedAt" DESC
    """
    rows = await db.fetch_all(query)
    if rows:
        print(f"Ditemukan {len(rows)} episode di Telegram Proxy:")
        for r in rows:
            print(f"- Anilist ID: {r['anilistId']} | Episode: {r['episodeNumber']} | Link: {r['episodeUrl'][:40]}...")
    else:
        print("Belum ada video di Telegram Proxy yang tercatat di database.")
        
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
