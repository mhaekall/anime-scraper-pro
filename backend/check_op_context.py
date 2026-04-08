import asyncio, httpx, re

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = "https://o.oploverz.ltd/series/one-piece/episode/1"
        r = await c.get(url)
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            # Find the index of episodeNumber:"1"
            idx = payload.find('episodeNumber:"1"')
            if idx != -1:
                print("Found episodeNumber:\"1\" at", idx)
                # Print 1000 chars around it
                start = max(0, idx - 500)
                end = min(len(payload), idx + 500)
                print(payload[start:end])
                print("="*80)
                
            idx_1156 = payload.find('episodeNumber:"1156"')
            if idx_1156 != -1:
                print("Found episodeNumber:\"1156\" at", idx_1156)
                start = max(0, idx_1156 - 500)
                end = min(len(payload), idx_1156 + 500)
                print(payload[start:end])

asyncio.run(main())