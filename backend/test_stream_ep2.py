import asyncio
from db.connection import database
from services.pipeline import get_episode_stream, ensure_episodes_exist

async def main():
    await database.connect()
    
    print("Testing Anilist 21 (One Piece) Episode 1")
    res1 = await get_episode_stream(21, 1.0)
    print("Ep 1 sources:", len(res1.get("sources", [])))
    if res1.get("sources"):
        print("Ep 1 URL:", res1["sources"][0]["url"])

    print("\nTesting Anilist 21 (One Piece) Episode 2")
    res2 = await get_episode_stream(21, 2.0)
    print("Ep 2 sources:", len(res2.get("sources", [])))
    if res2.get("sources"):
        print("Ep 2 URL:", res2["sources"][0]["url"])

    print("\nTesting Anilist 21 (One Piece) Episode 3")
    res3 = await get_episode_stream(21, 3.0)
    print("Ep 3 sources:", len(res3.get("sources", [])))
    if res3.get("sources"):
        print("Ep 3 URL:", res3["sources"][0]["url"])

    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())