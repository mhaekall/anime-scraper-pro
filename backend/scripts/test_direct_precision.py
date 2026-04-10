import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.providers import samehadaku_provider, otakudesu_provider, extractor

async def check_anime_direct(title: str, provider_name: str, provider):
    print(f"\n--- Checking '{title}' on {provider_name} ---")
    try:
        search_res = await provider.search(title)
        if not search_res:
            print("  Not found in search.")
            return
            
        anime_url = search_res[0]['url']
        print(f"  Found: {search_res[0]['title']} -> {anime_url}")
        
        details = await provider.get_anime_detail(anime_url)
        if not details or not details.get('episodes'):
            print("  No episodes found.")
            return
            
        # Check the first episode (often older episodes have more mature/stable direct links like mp4upload or wibufile)
        ep_url_first = details['episodes'][-1]['url'] 
        print(f"  Checking Episode 1: {ep_url_first}")
        
        sources = await provider.get_episode_sources(ep_url_first)
        if not sources:
            print("  No sources found.")
            return
            
        direct_count = 0
        for src in sources:
            url = src.get('url')
            if url:
                resolved = await extractor.extract_raw_video(url)
                if resolved.endswith(('.mp4', '.m3u8')):
                    print(f"  ✅ [DIRECT] {src.get('provider')} - {src.get('quality')} -> {resolved}")
                    direct_count += 1
        
        if direct_count == 0:
            print("  ❌ No direct links found for this episode.")
            
    except Exception as e:
        print(f"  Error: {e}")

async def main():
    test_titles = [
        "Jujutsu Kaisen",
        "Kimetsu no Yaiba",
        "Frieren",
        "Mashle"
    ]
    
    for title in test_titles:
        await check_anime_direct(title, "Samehadaku", samehadaku_provider)
        await check_anime_direct(title, "Otakudesu", otakudesu_provider)

if __name__ == "__main__":
    asyncio.run(main())
