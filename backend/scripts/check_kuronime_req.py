import httpx
import re
from bs4 import BeautifulSoup
import asyncio

async def test():
    headers = {"User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(verify=False) as client:
        res = await client.get("https://kuronime.sbs", headers=headers)
        soup = BeautifulSoup(res.text, "lxml")
        ep_link = None
        for a in soup.select("a"):
            href = a.get("href", "")
            if "/episode/" in href or "-episode-" in href:
                ep_link = href
                break
        
        if not ep_link: return
        res2 = await client.get(ep_link, headers=headers)
        soup2 = BeautifulSoup(res2.text, "lxml")
        
        for btn in soup2.find_all("div", class_="player-embed"):
            print("player-embed:", btn)
            
        for d in soup2.select("[data-id]"):
            print("data-id:", d.get("data-id"))
            
        for m in re.finditer(r'id=["\']([^"\']{50,})["\']', res2.text):
            print("Possible base64 ID:", m.group(1))

        match = re.search(r'var\s+req_id\s*=\s*["\']([^"\']+)["\']', res2.text)
        if match:
            print("req_id found:", match.group(1))
            
        match = re.search(r'data-.*?=["\']([^"\']{50,})["\']', res2.text)
        if match:
            print("long data attribute:", match.group(1))

asyncio.run(test())
