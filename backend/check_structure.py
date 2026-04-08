import asyncio, httpx, re, json
async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = "https://o.oploverz.ltd/series/one-piece/episode/1"
        r = await c.get(url)
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            # Find the episode: { ... } block
            idx = payload.find("episode:{")
            print("Found episode:{ at", idx)
            print(payload[idx:idx+300])

asyncio.run(main())
