import asyncio
from db.connection import database
from services.pipeline import get_episode_stream, ensure_episodes_exist

async def main():
    await database.connect()
    # Solo Leveling Season 2 anilistId is 177579 or 176...
    # Let's find the anilistId for Solo Leveling
    rows = await database.fetch_all("SELECT * FROM anime_metadata WHERE \"cleanTitle\" ILIKE '%Solo Leveling%'")
    for r in rows:
        print(r['cleanTitle'], r['anilistId'])
        await ensure_episodes_exist(r['anilistId'])
        res = await database.fetch_one(f'SELECT count(*) FROM episodes WHERE "anilistId" = {r["anilistId"]}')
        print("Episodes in DB:", dict(res))
        
        # Test first episode
        eps = await database.fetch_all(f'SELECT "episodeNumber" FROM episodes WHERE "anilistId" = {r["anilistId"]} ORDER BY "episodeNumber" ASC LIMIT 1')
        if eps:
            ep_num = eps[0]['episodeNumber']
            print("Testing stream for episode:", ep_num)
            stream = await get_episode_stream(r['anilistId'], ep_num)
            print("Sources found:", len(stream.get('sources', [])))
        
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())