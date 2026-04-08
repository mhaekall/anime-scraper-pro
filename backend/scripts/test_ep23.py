import asyncio, httpx, re

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        for ep in ["2", "3"]:
            print(f"--- EP {ep} ---")
            url = f"https://o.oploverz.ltd/series/one-piece/episode/{ep}"
            r = await c.get(url, follow_redirects=True)
            payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
            if payload_match:
                payload = payload_match.group(1)
                ep_match = re.search(r'episode:\{(.*?)streamUrl:(\[.*?\])', payload, re.DOTALL)
                if ep_match:
                    streams_str = ep_match.group(2)
                    streams = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', streams_str)
                    print("First Stream:", streams[0] if streams else "None")
                else:
                    print("ep_match failed")
asyncio.run(main())