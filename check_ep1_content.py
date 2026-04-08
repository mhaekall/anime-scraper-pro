import asyncio, httpx
from bs4 import BeautifulSoup
import re

async def main():
    async with httpx.AsyncClient(verify=False) as c:
        r = await c.get('https://o.oploverz.ltd/series/one-piece/episode/1')
        soup = BeautifulSoup(r.text, 'lxml')
        title = soup.find('title')
        print("Page Title:", title.text if title else "None")
        
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            streams = re.findall(r'\{source:"([^"]+)",url:"([^"]+)"\}', payload)
            print("Streams:", streams[:2])
            
asyncio.run(main())
