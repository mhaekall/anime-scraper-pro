import asyncio
import sys
import os

sys.path.append(os.path.abspath('backend'))
from db.connection import database
from services.pipeline import get_episode_stream

async def main():
    await database.connect()
    anilist_id = 180436
    ep_num = 1.0
    print(f"Testing stream extraction for AniList ID {anilist_id}, Episode {ep_num}...")
    res = await get_episode_stream(anilist_id, ep_num)
    import json
    print(json.dumps(res, indent=2))
    await database.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
