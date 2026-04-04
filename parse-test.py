import httpx
from bs4 import BeautifulSoup
import asyncio

async def test():
    async with httpx.AsyncClient(verify=False) as c:
        r = await c.get("https://o.oploverz.ltd/series/tensei-shitara-slime-datta-ken-s4/", follow_redirects=True)
        soup = BeautifulSoup(r.text, 'lxml')
        links = soup.select('a[href*="/episode/"]')
        for a in links:
            print(a.get("href"))
        
        # Oploverz might render episodes via Svelte JSON payload? Let's check!
        import re
        episodes_json = re.search(r'episodes:(\[.*?\])', r.text)
        if episodes_json:
            print("Found episodes JSON in script!")
            
asyncio.run(test())
