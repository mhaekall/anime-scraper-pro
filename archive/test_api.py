import asyncio
import httpx
from bs4 import BeautifulSoup
import traceback

client = httpx.AsyncClient(verify=False, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15.0)

async def test_episodes():
    try:
        print("Testing episodes...")
        url = 'https://o.oploverz.ltd/series/3d-kanojo-real-girl'
        r = await client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        episodes = []
        for a in soup.select('a[href*="/episode/"]'):
            title = a.get_text(strip=True).replace('<!--[!-->', '').replace('<!--]-->', '').replace('<!---->', '').strip()
            print("Found episode:", title)
    except Exception as e:
        traceback.print_exc()

async def test_home():
    try:
        print("Testing home...")
        url = 'https://o.oploverz.ltd/'
        r = await client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        for a in soup.select('a[href*="/episode/"]'):
            img_tag = a.find('img')
            img = img_tag.get('src') if img_tag else None
            title = img_tag.get('alt') or a.get('title') if img_tag else None
            if title and title.startswith('cover-'):
                title = title.replace('cover-', '').replace('-', ' ').title()
            if not title or not title.strip():
                parts = a.get('href').split('/')
                if len(parts) > 2:
                    title = parts[2].replace('-', ' ').title()
            if img and 'poster' in img:
                href = a.get('href')
                series_url_part = href.split('/episode/')[0]
                # print(title)
    except Exception as e:
        traceback.print_exc()

async def main():
    await test_home()
    await test_episodes()

asyncio.run(main())
