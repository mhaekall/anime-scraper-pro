import asyncio
from db.connection import database
import json

async def main():
    await database.connect()
    hero_rows = await database.fetch_all('''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."synopsis", m."score", m."nextAiringEpisode"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.score DESC NULLS LAST
        LIMIT 6
    ''')
    
    latest_rows = await database.fetch_all('''
        WITH latest_eps AS (
            SELECT "anilistId", max("episodeNumber") as max_ep, max("updatedAt") as last_up
            FROM episodes
            GROUP BY "anilistId"
            ORDER BY last_up DESC
            LIMIT 15
        )
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score",
               l.max_ep as "latestEpisode"
        FROM anime_metadata m
        JOIN latest_eps l ON m."anilistId" = l."anilistId"
        ORDER BY l.last_up DESC
    ''')
    print("Hero:", len(hero_rows))
    print("Latest:", len(latest_rows))
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
