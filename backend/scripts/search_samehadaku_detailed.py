import httpx
from bs4 import BeautifulSoup
import asyncio

async def run():
    async with httpx.AsyncClient(verify=False, follow_redirects=True) as c:
        for term in ["Youkoso Jitsuryoku", "Mushoku Tensei"]:
            r = await c.get("https://v2.samehadaku.how/?s=" + term.replace(" ", "+"), headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(r.text, "lxml")
            print(f"\n--- {term} ---")
            for article in soup.select("main article"):
                a = article.select_one("h3 a")
                if a:
                    print(f"Slug: {a.get('href').split('/')[-2]} | Title: {a.text.strip()}")

asyncio.run(run())