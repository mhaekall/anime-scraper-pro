import asyncio
from db.connection import database

async def main():
    await database.connect()
    count = await database.fetch_val("SELECT COUNT(*) FROM episodes WHERE \"anilistId\" = 21")
    print("DB episodes count:", count)
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
