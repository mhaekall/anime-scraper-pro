import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def main():
    async with httpx.AsyncClient(verify=False, follow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'}) as client:
        r = await client.get("https://o.oploverz.ltd/series/")
        print("Status:", r.status_code)
        soup = BeautifulSoup(r.text, 'lxml')
        series = []
        for a in soup.select('a[href^="/series/"]'):
            href = a.get('href')
            if len(href) > 8:
                series.append(href)
        
        if not series:
            print("No series found")
            return
            
        print("Testing series:", series[0])
        
        full_url = "https://o.oploverz.ltd" + series[0]
        r = await client.get(full_url)
        print("Detail status:", r.status_code)
        
        # Method 1
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            print("Method 1 (Payload) found.")
            matches = re.findall(r'slug:"([^"]+)".*?episodeNumber:"([^"]+)"', payload_match.group(1))
            if not matches:
                matches = re.findall(r'episodeNumber:"([^"]+)".*?slug:"([^"]+)"', payload_match.group(1))
                matches = [(s, e) for e, s in matches]
                
            print("First 5 slugs vs epNum from payload:")
            for slug, ep in matches[:5]:
                print(f"slug: {slug}, epNum: {ep}")
            
        soup = BeautifulSoup(r.text, 'lxml')
        eps = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/episode/' in href:
                eps.append(href)
        print("First 5 anchors from DOM:")
        for href in eps[:5]:
            print(f"href: {href}")

if __name__ == "__main__":
    asyncio.run(main())