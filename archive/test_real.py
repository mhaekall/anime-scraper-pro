import asyncio
import os
import sys
import json

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apps', 'api'))

from databases import Database
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
test_db = Database(db_url)

# Monkeypatch
import apps.api.db.connection as db_conn
db_conn.database = test_db
import apps.api.services.reconciler as rec_service
rec_service.database = test_db
import apps.api.services.db as db_service
db_service.database = test_db
import apps.api.services.pipeline as pipe_service
pipe_service.database = test_db
import apps.api.services.stream_cache as cache_service
cache_service.database = test_db

from apps.api.services.stream_cache import stream_cache

async def main():
    await test_db.connect()
    print("Testing get_stream for Tensura S1 Ep 1 directly from Kuronime via pipeline...")
    # The mapping should be in DB now.
    res = await cache_service.get_cached_stream(anilist_id=101280, ep_num=1.0)
    print(json.dumps(res, indent=2))
    await test_db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
