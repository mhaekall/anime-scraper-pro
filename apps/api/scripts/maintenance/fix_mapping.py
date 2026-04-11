import asyncio
from db.connection import database

async def main():
    await database.connect()
    # Check current mappings
    rows = await database.fetch_all("SELECT * FROM anime_mappings WHERE \"anilistId\" = 21")
    print("Current:", [dict(r) for r in rows])
    
    # Fix oploverz
    await database.execute(
        """
        UPDATE anime_mappings 
        SET "providerSlug" = 'one-piece'
        WHERE "anilistId" = 21 AND "providerId" = 'oploverz'
        """
    )
    
    rows = await database.fetch_all("SELECT * FROM anime_mappings WHERE \"anilistId\" = 21")
    print("After:", [dict(r) for r in rows])
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
