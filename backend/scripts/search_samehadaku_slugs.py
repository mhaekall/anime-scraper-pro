import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.providers import samehadaku_provider

async def search_samehadaku():
    searches = [
        "Tensei Shitara Slime Datta Ken",
        "Tensei Shitara Slime",
        "Classroom of the Elite",
        "Youkoso Jitsuryoku",
        "Mushoku Tensei",
    ]
    
    for s in searches:
        print(f"\n--- Searching: {s} ---")
        try:
            results = await samehadaku_provider.search(s)
            for res in results[:10]:
                print(f"Slug: {res['url'].split('/')[-2]} | Title: {res['title']}")
        except Exception as e:
            print("Error:", e)

if __name__ == "__main__":
    asyncio.run(search_samehadaku())
