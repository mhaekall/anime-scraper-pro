import asyncio
import httpx
import sys
import os
sys.path.append('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend')
from utils.ssrf_guard import SSRFSafeTransport

async def test():
    client = httpx.AsyncClient(
        verify=False,
        timeout=30.0,
        follow_redirects=False,
        transport=SSRFSafeTransport(),
    )
    try:
        r = await client.get('https://o.oploverz.ltd/')
        print("Status:", r.status_code)
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    asyncio.run(test())