import asyncio
from services.pipeline import get_provider_mappings

async def main():
    from db.connection import database
    await database.connect()
    res = await get_provider_mappings(21)
    print("Mappings:", res)
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
