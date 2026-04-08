import asyncio, httpx, re
async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = "https://o.oploverz.ltd/series/one-piece/episode/2"
        r = await c.get(url, follow_redirects=True)
        print("Final URL:", r.url)
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            
            # Check the episode number inside the payload
            ep_match = re.search(r'episode:\{(.*?)streamUrl:(\[.*?\])', payload, re.DOTALL)
            if ep_match:
                episode_context = ep_match.group(1)
                num = re.search(r'episodeNumber:"([^"]+)"', episode_context)
                title = re.search(r'title:"([^"]+)"', episode_context)
                print("Episode number in payload:", num.group(1) if num else "Not found")
                print("Episode title in payload:", title.group(1) if title else "Not found")
            else:
                print("episode:{... not found")

asyncio.run(main())
