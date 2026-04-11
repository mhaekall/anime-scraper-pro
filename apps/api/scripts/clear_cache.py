import asyncio
from db.connection import database

async def main():
    await database.connect()
    await database.execute("TRUNCATE TABLE video_cache")
    print("video_cache truncated. All bad streams are gone.")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())