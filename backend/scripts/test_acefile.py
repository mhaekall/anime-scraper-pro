import asyncio
import httpx
import re

async def test_acefile_player():
    url = "https://acefile.co/player/111377159"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    print(f"Testing Acefile Player: {url}")
    async with httpx.AsyncClient(verify=False, follow_redirects=True) as client:
        try:
            res = await client.get(url, headers=headers)
            print(f"Status: {res.status_code}")
            
            # Print a portion of the response or search for mp4
            match = re.search(r'file:\s*["\'](https?://[^"\']+)["\']', res.text)
            if match:
                print(f"Found MP4 (regex 1): {match.group(1)}")
                
            match2 = re.search(r'source\s*src=["\'](https?://[^"\']+)["\']', res.text)
            if match2:
                print(f"Found MP4 (regex 2): {match2.group(1)}")
                
            with open("test_acefile_player.html", "w") as f:
                f.write(res.text)
            print("Saved to test_acefile_player.html")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_acefile_player())
