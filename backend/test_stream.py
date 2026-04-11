import asyncio
import traceback
from db.connection import database
from services.pipeline import get_episode_stream

async def test():
    try:
        await database.connect()
        res = await get_episode_stream(180745, 1)
        print("RESULT:", res)
    except Exception as e:
        traceback.print_exc()
    finally:
        await database.disconnect()

asyncio.run(test())