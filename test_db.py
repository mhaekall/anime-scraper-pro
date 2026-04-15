import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv(".env")
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

async def test():
    database = Database(DATABASE_URL, min_size=1, max_size=5)
    await database.connect()
    res = await database.fetch_one("SELECT 1")
    print("DB connection OK:", res)
    await database.disconnect()

asyncio.run(test())
