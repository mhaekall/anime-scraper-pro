import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'apps', 'api'))

from databases import Database
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
test_db = Database(db_url)

import apps.api.db.connection as db_conn
db_conn.database = test_db
import apps.api.services.db as db_service
db_service.database = test_db
import apps.api.services.pipeline as pipe_service
pipe_service.database = test_db

async def main():
    await test_db.connect()
    
    print("Syncing episodes for Tensura S1 (101280)...")
    res = await pipe_service.sync_anime_episodes(101280)
    print(res)
    
    await test_db.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
