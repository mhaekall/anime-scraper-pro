import asyncio
import httpx
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
}

async def run():
    async with httpx.AsyncClient(verify=False, headers=HEADERS, follow_redirects=True) as c:
        url = "https://desustream.info/dstream/updesu/v5/index.php?id=YUxRQjVabVNiNDB2Mm1hUnI1M2xFUmpiV1Rvbkw2Q0xhVVBpREx5TGk2dz0="
        # Fetch json mode
        r = await c.get(f"{url}&mode=json")
        data = r.json()
        print("Desustream JSON:", data)
        if data.get('ok') and data.get('video'):
            video_url = data['video']
            print("Found video url:", video_url)
            
            # if it is a blogger URL, we can resolve blogger
            if 'blogger.com' in video_url:
                r2 = await c.get(video_url)
                # extract from play_url string
                match = re.search(r'"play_url":"([^"]+)"', r2.text)
                if match:
                    print("Blogger resolved:", match.group(1).encode('utf-8').decode('unicode_escape'))

asyncio.run(run())
