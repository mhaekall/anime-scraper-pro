import asyncio, httpx, re

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = f"https://o.oploverz.ltd/series/one-piece/episode/1"
        r = await c.get(url)
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            streams = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', payload)
            
            print(f"Total streams found in payload: {len(streams)}")
            for i, (src, link) in enumerate(streams[:10]):
                print(f"{i}: {src} - {link}")
            
            # Look for SvelteKit data structure
            # A typical structure might be an array of episodes and their streams.

asyncio.run(main())