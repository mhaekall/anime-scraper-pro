import asyncio
from db.connection import database

async def main():
    await database.connect()
    # One Piece anilistId is 21
    rows = await database.fetch_all("""
        SELECT "episodeNumber", "episodeTitle", "episodeUrl", "providerId"
        FROM episodes
        WHERE "anilistId" = 21
        ORDER BY "episodeNumber" ASC
        LIMIT 5
    """)
    for r in rows:
        print(dict(r))
        
    print("--- DESC ---")
    rows_desc = await database.fetch_all("""
        SELECT "episodeNumber", "episodeTitle", "episodeUrl", "providerId"
        FROM episodes
        WHERE "anilistId" = 21
        ORDER BY "episodeNumber" DESC
        LIMIT 5
    """)
    for r in rows_desc:
        print(dict(r))
        
    await database.disconnect()

asyncio.run(main())