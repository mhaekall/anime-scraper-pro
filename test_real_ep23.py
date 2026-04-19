import asyncio
import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, root_dir)
sys.path.append(os.path.join(root_dir, 'apps', 'api'))

from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

test_db = Database(db_url)
import apps.api.db.connection as db_conn
db_conn.database = test_db

from apps.api.services.ingestion.main import IngestionEngine

async def test_ep23():
    await test_db.connect()
    row = await test_db.fetch_one('SELECT id FROM episodes WHERE "anilistId" = 101280 AND "episodeNumber" = 23.0 LIMIT 1')
    
    direct_url = "https://pixeldrain.com/api/file/rYUUkSdm"
    engine = IngestionEngine()
    
    print("Memulai tes ingestion Ep 23 lokal...")
    # Force release lock
    from apps.api.services.cache import upstash_del
    await upstash_del("ingest:101280:23.0")
    
    success = await engine.process_episode(
        episode_id=row['id'],
        anilist_id=101280,
        provider_id="oploverz",
        episode_number=23.0,
        direct_video_url=direct_url
    )
    print(f"Hasil: {success}")
    await test_db.disconnect()

if __name__ == "__main__":
    asyncio.run(test_ep23())
