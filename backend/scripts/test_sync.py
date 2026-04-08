import asyncio
from services.pipeline import sync_anime_episodes, get_anime_detail
from db.connection import database

async def main():
    await database.connect()
    print("Testing sync for anilist_id=21")
    await sync_anime_episodes(21)
    detail = await get_anime_detail(21)
    print("Result eps:", len(detail.get("episodes", [])))
    print("First ep:", detail.get("episodes", [])[0] if detail.get("episodes") else None)
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
