import asyncio, httpx, re

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = "https://o.oploverz.ltd/series/one-piece/episode/1"
        r = await c.get(url)
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            
            # Simple regex search
            ep_match = re.search(r'episode:\{(.*?)streamUrl:(\[.*?\])', payload, re.DOTALL)
            if ep_match:
                print("ep_match found!")
                streams_str = ep_match.group(2)
                print("streamUrl array:", streams_str[:100])
                streams = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', streams_str)
                print("Streams:", streams)
            else:
                print("episode:{... not found")

asyncio.run(main())