import asyncio
import os
import sys

# Insert root dir to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(1, os.path.join(os.path.dirname(os.path.abspath(__file__)), "apps", "api"))

from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

test_db = Database(db_url)

# Monkey patch database
import apps.api.db.connection as db_conn
db_conn.database = test_db

from services.ingestion.main import IngestionEngine

async def force_ingest():
    await test_db.connect()
    
    # Ambil Tensura S1 (Ep 1)
    row = await test_db.fetch_one('SELECT id FROM episodes WHERE "anilistId" = 101280 AND "episodeNumber" = 1.0')
    if not row:
        print("Episode not found")
        return
        
    ep_id = row['id']
    aid = 101280
    ep_num = 1.0
    direct_url = "https://a6.mp4upload.com:183/d/w2xqdoxpz3b4quuoxkqeuzarixrlhhgqlfxlszjp7hwtqjiuoeqjzjfvnoi2bcpcv4wh6aem/video.mp4"
    provider_id = "kuronime"
    
    print(f"Mengambil stream untuk {aid} Ep {ep_num}...")
    
    engine = IngestionEngine()
    
    success = await engine.process_episode(
        episode_id=ep_id,
        anilist_id=aid,
        provider_id=provider_id,
        episode_number=ep_num,
        direct_url=direct_url
    )
    print(f"Ingest Result {aid} Ep {ep_num}: {success}")

    await test_db.disconnect()

if __name__ == "__main__":
    asyncio.run(force_ingest())
