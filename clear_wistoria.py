import asyncio, os
from databases import Database
from dotenv import load_dotenv

load_dotenv('apps/api/.env')
db_url = os.getenv('DATABASE_URL')
if db_url and db_url.startswith('postgresql://'):
    db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)

async def clear_db():
    db = Database(db_url)
    await db.connect()
    # Clear the MANUAL_TEST url so the script can fetch the raw source and ingest properly
    res = await db.execute('UPDATE episodes SET "episodeUrl" = \'\' WHERE id = 26098')
    print(f"Cleared DB row for Wistoria: {res}")
    await db.disconnect()

asyncio.run(clear_db())