import asyncio
from db.connection import database

async def main():
    await database.connect()
    print("Fixing One Piece mapping (setting to ID 21)...")
    
    # Remove all mappings involving ID 21 or slug 'one-piece' on oploverz
    await database.execute('DELETE FROM anime_mappings WHERE "anilistId" = 21 AND "providerId" = \'oploverz\'')
    await database.execute('DELETE FROM anime_mappings WHERE "providerSlug" = \'one-piece\' AND "providerId" = \'oploverz\'')
    
    # Insert correct mapping
    await database.execute('INSERT INTO anime_mappings ("anilistId", "providerId", "providerSlug") VALUES (21, \'oploverz\', \'one-piece\')')
    
    # Also fix Dr. Stone (example from mass sync failure)
    await database.execute('DELETE FROM anime_mappings WHERE "providerSlug" = \'dr-stone-season-4-science-future\'')
    await database.execute('INSERT INTO anime_mappings ("anilistId", "providerId", "providerSlug") VALUES (172019, \'oploverz\', \'dr-stone-season-4-science-future\')')

    print("Cleaning up numeric slugs for oploverz...")
    await database.execute('DELETE FROM anime_mappings WHERE "providerId" = \'oploverz\' AND "providerSlug" ~ \'^[0-9]+$\'')
    
    await database.disconnect()
    print("✅ Mappings fixed.")

if __name__ == "__main__":
    asyncio.run(main())
