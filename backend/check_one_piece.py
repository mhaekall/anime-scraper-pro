import asyncio
from db.connection import database

async def main():
    await database.connect()
    mappings = await database.fetch_all('SELECT * FROM anime_mappings WHERE "anilistId" = 21')
    print("Mappings for ID 21:", [dict(r) for r in mappings])
    count = await database.fetch_val('SELECT COUNT(*) FROM episodes WHERE "anilistId" = 21')
    print("Episode count for ID 21:", count)
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
