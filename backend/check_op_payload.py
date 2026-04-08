import asyncio
import httpx
import re
from bs4 import BeautifulSoup

async def main():
    async with httpx.AsyncClient(verify=False, follow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'}) as client:
        r = await client.get("https://o.oploverz.ltd/series/one-piece/")
        print("Status code:", r.status_code)
        
        # Method 1
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            print("Method 1 (Payload) found.")
            matches = re.findall(r'slug:"([^"]+)".*?episodeNumber:"([^"]+)"', payload_match.group(1))
            print("First 5 slugs vs epNum from payload:")
            for slug, ep in matches[:5]:
                print(f"slug: {slug}, epNum: {ep}")
                
            if not matches:
                matches_rev = re.findall(r'episodeNumber:"([^"]+)".*?slug:"([^"]+)"', payload_match.group(1))
                for ep, slug in matches_rev[:5]:
                    print(f"slug: {slug}, epNum: {ep}")
        else:
            print("No payload found.")
            
        # Method 2 (Anchor Tags)
        soup = BeautifulSoup(r.text, 'lxml')
        eps = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/episode/' in href:
                ep_match = re.search(r'/episode/([\d\.]+)', href)
                if ep_match:
                    eps.append((href, ep_match.group(1)))
        
        print("First 5 anchors from DOM:")
        for href, ep in eps[:5]:
            print(f"href: {href}, epNum: {ep}")

if __name__ == "__main__":
    asyncio.run(main())