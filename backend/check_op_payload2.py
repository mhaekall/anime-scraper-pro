import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.clients import scraping_client

async def main():
    res = await scraping_client.get("https://o.oploverz.ltd/series/one-piece/")
    print("Status code:", res.status_code)
    import re
    payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', res.text, re.DOTALL)
    if payload_match:
        print("Payload found. Snippet:", payload_match.group(1)[:200])
        # Find slugs and episodeNumbers
        eps = re.findall(r'slug:"([^"]+)",episodeNumber:"([^"]+)"', payload_match.group(1))
        print("Matches (slug, episodeNumber):", eps[:10])

if __name__ == "__main__":
    asyncio.run(main())