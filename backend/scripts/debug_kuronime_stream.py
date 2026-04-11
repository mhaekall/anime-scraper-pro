import asyncio
import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv()

from db.connection import database
from services.pipeline import resolve_episode_sources

async def main():
    await database.connect()
    try:
        url = "https://kuronime.sbs/nonton-tensei-shitara-slime-datta-ken-season-4-episode-1/"
        print(f"Testing resolution for: {url}")
        result = await resolve_episode_sources(url, "kuronime")
        print("Result:")
        import json
        print(json.dumps(result, indent=2))
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
