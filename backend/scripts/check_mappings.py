import asyncio
from db.connection import database

async def main():
    try:
        await database.connect()
        rows = await database.fetch_all('SELECT "anilistId", "providerId", "providerSlug" FROM anime_mappings LIMIT 10')
        print(f"Total mappings found: {len(rows)}")
        for r in rows:
            print(f"AniList: {r['anilistId']} | Provider: {r['providerId']} | Slug: {r['providerSlug']}")
        await database.disconnect()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
