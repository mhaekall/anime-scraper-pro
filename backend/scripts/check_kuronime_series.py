import asyncio
import httpx
from bs4 import BeautifulSoup
import json

async def test_series():
    headers = {"User-Agent": "Mozilla/5.0"}
    base_url = "https://kuronime.sbs"
    
    async with httpx.AsyncClient(verify=False) as client:
        # First get home page to find a series URL
        res = await client.get(base_url, headers=headers)
        soup = BeautifulSoup(res.text, "lxml")
        series_link = None
        for a in soup.select("a"):
            href = a.get("href", "")
            if "/anime/" in href:
                series_link = href
                break
                
        if not series_link:
            print("No series link found")
            return
            
        print(f"Fetching series: {series_link}")
        res2 = await client.get(series_link, headers=headers)
        with open("test_kuronime_series.html", "w") as f:
            f.write(res2.text)
        
        soup2 = BeautifulSoup(res2.text, "lxml")
        
        # Test extraction
        title = soup2.select_one("h1.entry-title")
        title = title.text.strip() if title else ""
        print("Title:", title)
        
        poster = soup2.select_one(".ts-post-image")
        poster = poster.get("src") if poster else ""
        print("Poster:", poster)
        
        synopsis = soup2.select_one(".entry-content[itemprop='description']")
        synopsis = synopsis.text.strip() if synopsis else ""
        print("Synopsis:", synopsis[:50])
        
        episodes = []
        for li in soup2.select(".eplister ul li"):
            a = li.select_one("a")
            if not a: continue
            ep_url = a.get("href")
            ep_title = li.select_one(".epl-title").text.strip() if li.select_one(".epl-title") else ""
            ep_num = li.select_one(".epl-num").text.strip() if li.select_one(".epl-num") else "0"
            episodes.append({"title": ep_title, "url": ep_url, "number": ep_num})
            
        print(f"Found {len(episodes)} episodes")
        if episodes:
            print("First ep:", episodes[0])

if __name__ == "__main__":
    asyncio.run(test_series())