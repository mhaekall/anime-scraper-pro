import asyncio
import httpx
import sys

async def test_wibufile_stream():
    # A known direct link from previous tests
    url = "https://s0.wibufile.com/video01/SnF-S2-10-END-MP4HD-SAMEHADAKU.CARE.mp4"
    
    print(f"Testing direct stream URL: {url}")
    
    # 1. Test without any special headers
    print("\n--- 1. Testing WITHOUT headers ---")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.head(url, follow_redirects=True)
            print(f"Status: {res.status_code}")
            print(f"Headers: {res.headers}")
        except Exception as e:
            print(f"Error: {e}")
            
    # 2. Test with basic browser headers
    print("\n--- 2. Testing WITH User-Agent ---")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
    }
    async with httpx.AsyncClient() as client:
        try:
            res = await client.head(url, headers=headers, follow_redirects=True)
            print(f"Status: {res.status_code}")
            print(f"Headers: {res.headers}")
        except Exception as e:
            print(f"Error: {e}")
            
    # 3. Test with Referer (Samehadaku)
    print("\n--- 3. Testing WITH Samehadaku Referer ---")
    headers['Referer'] = 'https://v2.samehadaku.how/'
    async with httpx.AsyncClient() as client:
        try:
            res = await client.head(url, headers=headers, follow_redirects=True)
            print(f"Status: {res.status_code}")
            print(f"Headers: {res.headers}")
        except Exception as e:
            print(f"Error: {e}")

    # 4. Test with Origin (Samehadaku)
    print("\n--- 4. Testing WITH Samehadaku Origin ---")
    headers['Origin'] = 'https://v2.samehadaku.how'
    async with httpx.AsyncClient() as client:
        try:
            res = await client.head(url, headers=headers, follow_redirects=True)
            print(f"Status: {res.status_code}")
            print(f"Headers: {res.headers}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_wibufile_stream())
