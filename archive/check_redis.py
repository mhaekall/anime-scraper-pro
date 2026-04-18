import asyncio
import os
import hashlib
import sys

sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))
from services.cache import upstash_get

async def main():
    url = 'https://kuronime.sbs/nonton-tensei-shitara-slime-datta-ken-episode-1/'
    key = f'stream:v3:{hashlib.md5(url.encode()).hexdigest()}'
    print(f"Checking Redis key: {key}")
    val = await upstash_get(key)
    import json
    print(json.dumps(val, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
