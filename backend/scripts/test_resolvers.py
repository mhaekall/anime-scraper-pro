import asyncio
import httpx
import re
from bs4 import BeautifulSoup

async def test_extract_acefile(url):
    print(f"Testing Acefile: {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    async with httpx.AsyncClient(follow_redirects=True, verify=False) as client:
        try:
            res = await client.get(url, headers=headers)
            print(f"Status: {res.status_code}")
            
            # Check for video source in HTML
            match = re.search(r'file:\s*["\'](https?://[^"\']+\.mp4[^"\']*)["\']', res.text)
            if match:
                print(f"Found MP4 (regex): {match.group(1)}")
            
            soup = BeautifulSoup(res.text, 'html.parser')
            video = soup.find('video')
            if video:
                src = video.find('source')
                if src and src.get('src'):
                    print(f"Found MP4 (video tag): {src.get('src')}")
                elif video.get('src'):
                    print(f"Found MP4 (video src): {video.get('src')}")
                    
            # Check for download button or form
            a_tag = soup.find('a', class_='btn btn-primary btn-block')
            if a_tag and a_tag.get('href'):
                print(f"Found Download Link: {a_tag.get('href')}")
                
            # If there's a play URL or something
            # let's just print a snippet of the script tags
            scripts = soup.find_all('script')
            for s in scripts:
                if s.string and ('mp4' in s.string or 'm3u8' in s.string):
                    print("Found media in script:")
                    print(s.string[:200])
                    
        except Exception as e:
            print(f"Error: {e}")

async def test_extract_blogger(url):
    print(f"\nTesting Blogger: {url}")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    async with httpx.AsyncClient(follow_redirects=True) as client:
        try:
            res = await client.get(url, headers=headers)
            print(f"Status: {res.status_code}")
            
            # Blogger video urls are usually in "play_url" inside a JSON-like structure
            match = re.search(r'"play_url":"([^"]+)"', res.text)
            if match:
                play_url = match.group(1).encode('utf-8').decode('unicode_escape')
                print(f"Found play_url: {play_url}")
                
            match2 = re.search(r'VIDEO_CONFIG\s*=\s*(\{.*?\});', res.text)
            if match2:
                print(f"Found VIDEO_CONFIG: {match2.group(1)[:200]}")
                
        except Exception as e:
            print(f"Error: {e}")

async def main():
    # Acefile from Solo Leveling or One Piece
    await test_extract_acefile("https://acefile.co/f/111377159/op-la-1-720p-x265-samehadaku-care-mkv")
    
    # Blogger from One Piece
    await test_extract_blogger("https://www.blogger.com/video.g?token=AD6v5dwDuyYvEJuY4HftrSVoL7vRq61Bkk6oI-7pP4fodLYjLts6cf0yMWccebEu8TSN4tqMumu1YgM7vIYeZc_h7JfbKUsVLouaTgnwGehWzylP9Ym3iXtesbOd279DC7XR3PjSSkPI")

if __name__ == "__main__":
    asyncio.run(main())
