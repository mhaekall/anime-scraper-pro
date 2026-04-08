import asyncio
from db.connection import database
from services.pipeline import get_episode_stream, ensure_episodes_exist

async def main():
    await database.connect()
    print("Testing Anilist 172019 (Dr Stone) Episode 1")
    await ensure_episodes_exist(172019)
    result = await get_episode_stream(172019, 1.0)
    print("Total sources found:", len(result.get("sources", [])))
    for s in result.get("sources", [])[:3]:
        print(s['quality'], "-", s['url'], "-", s.get('resolved', ''))
        
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())