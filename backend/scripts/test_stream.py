import asyncio
from providers.oploverz import OploverzProvider
import json

async def main():
    p = OploverzProvider()
    url = "https://o.oploverz.ltd/series/one-piece/episode/1156"
    print(f"Testing stream for: {url}")
    res = await p.get_episode_sources(url)
    print("Result:", json.dumps(res, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
