import asyncio
import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
# Insert root first so `services.ingestion` is found
sys.path.insert(0, root_dir)
# Insert apps/api second so `db.connection` is found
sys.path.insert(1, os.path.join(root_dir, 'apps', 'api'))

from databases import Database
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
test_db = Database(db_url)

# Monkeypatch DB connection
import apps.api.db.connection as db_conn
db_conn.database = test_db

from services.ingestion.main import IngestionEngine

async def main():
    await test_db.connect()
    row = await test_db.fetch_one(
        'SELECT id FROM episodes WHERE "anilistId" = :aid AND "episodeNumber" = :ep LIMIT 1',
        values={"aid": 101280, "ep": 1}
    )
    if not row:
        print("Episode not found in DB")
        return
    
    episode_id = row["id"]
    # The 720p URL the user downloaded successfully
    direct_url = "https://a6.mp4upload.com:183/d/w2xqdoxpz3b4quuoxkqeuzarixrlhhgqlfxlszjp7hwtqjiuoeqjzjfvnoi2bcpcv4wh6aem/video.mp4"
    
    print(f"Starting ingestion for Episode ID: {episode_id} with 720p URL")
    engine = IngestionEngine()
    
    try:
        await engine.process_episode(
            episode_id=episode_id,
            anilist_id=101280,
            provider_id="kuronime",
            episode_number=1.0,
            direct_url=direct_url
        )
        print("Ingestion completed successfully.")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Ingestion failed: {e}")
    
    await test_db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
