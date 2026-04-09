import asyncio
import httpx
import re

async def test():
    url = "https://www.blogger.com/video.g?token=AD6v5dwDuyYvEJuY4HftrSVoL7vRq61Bkk6oI-7pP4fodLYjLts6cf0yMWccebEu8TSN4tqMumu1YgM7vIYeZc_h7JfbKUsVLouaTgnwGehWzylP9Ym3iXtesbOd279DC7XR3PjSSkPI"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        with open('blogger.html', 'w') as f:
            f.write(res.text)
        print("HTML saved to blogger.html")

asyncio.run(test())