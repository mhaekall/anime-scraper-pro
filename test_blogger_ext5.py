import asyncio
import httpx
import re
import json
import urllib.parse

async def test():
    url = "https://www.blogger.com/video.g?token=AD6v5dwDuyYvEJuY4HftrSVoL7vRq61Bkk6oI-7pP4fodLYjLts6cf0yMWccebEu8TSN4tqMumu1YgM7vIYeZc_h7JfbKUsVLouaTgnwGehWzylP9Ym3iXtesbOd279DC7XR3PjSSkPI"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        
        # Look for the video play payload
        # Sometimes it's inside `VIDEO_CONFIG`
        print("Finding all JSON-like structures...")
        matches = re.findall(r'(\[\[.*\]\])', res.text)
        for m in matches:
            if 'play_url' in m or 'googlevideo' in m:
                print("FOUND IN ARRAY:", m[:200])

        # Try to find play_url ignoring case
        play_url_matches = re.findall(r'"play_url"\s*:\s*"([^"]+)"', res.text, re.IGNORECASE)
        for p in play_url_matches:
            print("Found play_url:", p)
            
        # Try to find googlevideo
        gv_matches = re.findall(r'(https://[^\"]+googlevideo\.com/videoplayback[^\"]+)', res.text)
        for g in gv_matches:
            print("Found googlevideo:", g)
            
        # Check if there is an iframe
        iframe_matches = re.findall(r'<iframe.*?src="([^"]+)"', res.text)
        for i in iframe_matches:
            print("Found iframe:", i)

asyncio.run(test())