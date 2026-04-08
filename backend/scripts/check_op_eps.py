import asyncio, httpx, re

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        for ep in ["2", "3"]:
            url = f"https://o.oploverz.ltd/series/one-piece/episode/{ep}"
            r = await c.get(url)
            payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
            if payload_match:
                payload = payload_match.group(1)
                ep_match = re.search(r'episode:\{(.*?)streamUrl:(\[.*?\])', payload, re.DOTALL)
                if ep_match:
                    streams_str = ep_match.group(2)
                    streams = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', streams_str)
                    print(f"Ep {ep} Streams:", streams[:2])
                else:
                    print(f"Ep {ep} not found")

asyncio.run(main())