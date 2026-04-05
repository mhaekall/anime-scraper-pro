import asyncio
import httpx
from bs4 import BeautifulSoup

HEADERS = {'User-Agent': 'Mozilla/5.0'}
client = httpx.AsyncClient(verify=False, headers=HEADERS, follow_redirects=True)

async def resolve_video_source(url: str):
    try:
        print(f"Resolving: {url}")
        if 'desustream' in url or 'desudrives' in url:
            fetch_url = f"{url}&mode=json" if '?' in url else f"{url}?mode=json"
            res = await client.get(fetch_url)
            data = res.json()
            if data.get('ok') and data.get('video'):
                return await resolve_video_source(data['video'].replace('&amp;', '&'))
                
        elif 'blogger.com' in url:
            res = await client.get(url)
            import re
            match = re.search(r'"play_url":"([^"]+)"', res.text)
            if match:
                decoded_url = match.group(1).encode('utf-8').decode('unicode_escape')
                return decoded_url
                
        elif '4meplayer.pro' in url or 'oplo2.' in url:
            res = await client.get(url)
            soup = BeautifulSoup(res.text, 'lxml')
            iframe = soup.find('iframe')
            if iframe and iframe.get('src'):
                return await resolve_video_source(iframe['src'])
                
    except Exception as e:
        print(f"Resolve error for {url}: {e}")
    return url

async def test():
    res = await resolve_video_source("https://oplo2.4meplayer.pro/#9nwdq")
    print("Resolved:", res)

asyncio.run(test())
