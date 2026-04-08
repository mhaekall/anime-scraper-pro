import asyncio, httpx
from bs4 import BeautifulSoup

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        url = f"https://o.oploverz.ltd/series/one-piece/episode/1"
        r = await c.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        iframes = soup.find_all('iframe')
        print(f"Total iframes: {len(iframes)}")
        for iframe in iframes:
            print("Iframe src:", iframe.get('src'))
            
        # check any other elements with URLs
        print("Looking for video or embed tags...")
        print("Embeds:", soup.find_all('embed'))
        print("Videos:", soup.find_all('video'))

asyncio.run(main())