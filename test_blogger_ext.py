import asyncio
import httpx
import re
import json

async def test():
    url = "https://www.blogger.com/video.g?token=AD6v5dwDuyYvEJuY4HftrSVoL7vRq61Bkk6oI-7pP4fodLYjLts6cf0yMWccebEu8TSN4tqMumu1YgM7vIYeZc_h7JfbKUsVLouaTgnwGehWzylP9Ym3iXtesbOd279DC7XR3PjSSkPI"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        
        # Method 1: Play_url
        match = re.search(r'"play_url":"([^"]+)"', res.text)
        if match:
            print("Method 1 (play_url):", match.group(1).encode('utf-8').decode('unicode_escape'))
        
        # Method 2: VIDEO_CONFIG
        config_match = re.search(r'VIDEO_CONFIG\s*=\s*({.*?});', res.text)
        if config_match:
            try:
                config = json.loads(config_match.group(1))
                streams = config.get('streams', [])
                print(f"Method 2 (VIDEO_CONFIG): Found {len(streams)} streams.")
                for s in streams:
                    print(f"  - {s.get('format_id')}: {s.get('play_url')}")
            except Exception as e:
                print(f"Method 2 Error: {e}")
                
        # Method 3: fmt_stream_map
        fmt_match = re.search(r'"fmt_stream_map"\s*,\s*"([^"]+)"', res.text)
        if fmt_match:
            streams = fmt_match.group(1).encode('utf-8').decode('unicode_escape').split(',')
            print(f"Method 3 (fmt_stream_map): Found {len(streams)} streams.")
            for s in streams:
                print(f"  - {s}")

        # If all fail, print snippets of script tags
        if not (match or config_match or fmt_match):
            print("--- NO KNOWN METHODS WORKED ---")
            scripts = re.findall(r'<script.*?>.*?</script>', res.text, re.DOTALL)
            for i, script in enumerate(scripts):
                if 'video' in script.lower() or 'url' in script.lower() or 'play' in script.lower():
                    print(f"--- Script {i} Snippet ---")
                    print(script[:500])

asyncio.run(test())