import asyncio
from db.connection import database

async def main():
    await database.connect()
    row = await database.fetch_one('SELECT * FROM anime_mappings WHERE "providerId" = \'oploverz\' AND "providerSlug" = \'one-piece\'')
    print("Mapping for one-piece:", dict(row) if row else "None")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
