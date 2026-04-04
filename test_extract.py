import asyncio
import httpx
import re

async def test():
    client = httpx.AsyncClient(verify=False, follow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'})
    r = await client.get('https://o.oploverz.ltd/series/one-piece/')
    print("Length:", len(r.text))
    matches = re.findall(r'episodeNumber:"([^"]+)"', r.text)
    print("Matches:", matches)

asyncio.run(test())
