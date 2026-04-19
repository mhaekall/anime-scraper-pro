import asyncio
import os
import sys

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
    # Kembalikan ke URL Kuronime asli agar user bisa nonton dengan teks via Iframe/Stream web dulu
    url = "https://kuronime.sbs/nonton-tensei-shitara-slime-datta-ken-episode-23/"
    await db.execute('UPDATE episodes SET "episodeUrl" = :url, "providerId" = \'kuronime\' WHERE "anilistId" = 101280 AND "episodeNumber" = 23.0', values={"url": url})
    print("✅ Episode 23 RESTORED to original provider link (with subtitles).")
    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
