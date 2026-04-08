import asyncio
from db.connection import database

async def main():
    await database.connect()
    rows = await database.fetch_all("SELECT \"anilistId\", \"cleanTitle\" FROM anime_metadata LIMIT 10")
    for r in rows:
        print(dict(r))
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())