import asyncio
import httpx
from bs4 import BeautifulSoup

async def test():
    client = httpx.AsyncClient(verify=False, follow_redirects=True, headers={'User-Agent': 'Mozilla/5.0'})
    r = await client.get('https://o.oploverz.ltd/')
    soup = BeautifulSoup(r.text, 'lxml')
    
    print("--- SERIES LINKS ---")
    count = 0
    for a in soup.select('a[href^="/series/"]'):
        href = a.get('href')
        title = a.get_text(strip=True)
        if len(href) > 8 and title:
            print(f"Title: {title} | Href: {href}")
            count += 1
            if count > 10: break

asyncio.run(test())
