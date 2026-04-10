import asyncio
import httpx
from bs4 import BeautifulSoup
import re

async def test_kuronime():
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    base_url = "https://kuronime.sbs"
    print(f"Testing {base_url}...")
    
    async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=15.0) as client:
        try:
            res = await client.get(base_url, headers=headers)
            print(f"Home Status: {res.status_code}")
            soup = BeautifulSoup(res.text, "lxml")
            
            ep_link = None
            for a in soup.select("a"):
                href = a.get("href", "")
                if "/episode/" in href or "episode" in href.lower() or "-episode-" in href.lower():
                    ep_link = href if href.startswith("http") else base_url + href
                    break
            
            if not ep_link:
                print("Could not find any episode link on homepage.")
                return
                
            print(f"Found Episode Link: {ep_link}")
            res2 = await client.get(ep_link, headers=headers)
            print(f"Episode Page Status: {res2.status_code}")
            soup2 = BeautifulSoup(res2.text, "lxml")
            
            iframes = soup2.find_all("iframe")
            print(f"Found {len(iframes)} iframes.")
            for i, iframe in enumerate(iframes):
                print(f"  Iframe {i+1} src: {iframe.get('src')}, data-src: {iframe.get('data-src')}")
                
            server_buttons = soup2.select(".server-buttons button, .server-buttons a, .mirrors li a")
            print(f"Found {len(server_buttons)} server buttons.")
            for i, btn in enumerate(server_buttons):
                print(f"  Btn {i+1}: {btn.get('data-video', btn.get('href', ''))} - {btn.text.strip()}")
                
            with open("test_kuronime_ep.html", "w") as f:
                f.write(res2.text)
            print("Saved Episode HTML to test_kuronime_ep.html")
                    
            match = re.search(r"[\"'](https?://[^\s\"']+\.(?:mp4|m3u8)[^\s\"']*)[\"']", res2.text)
            if match:
                print(f"Found direct link in source: {match.group(1)}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_kuronime())
