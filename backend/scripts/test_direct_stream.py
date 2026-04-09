import asyncio
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.providers import otakudesu_provider, extractor

async def test_direct_extraction():
    print("--- Testing Otakudesu ---")
    otakudesu_eps_url = "https://otakudesu.blog/episode/slds-episode-11-sub-indo/"
    print(f"Fetching sources from: {otakudesu_eps_url}")
    try:
        otaku_res = await otakudesu_provider.get_episode_sources(otakudesu_eps_url)
        print(f"Otakudesu Raw Sources: {otaku_res}")
        if not otaku_res:
            print("No sources found on Otakudesu, maybe the URL is old/wrong. Let's search one first.")
            # Search for Solo Leveling
            search_res = await otakudesu_provider.provider.search("Solo Leveling")
            if search_res:
                anime_url = search_res[0]['url']
                details = await otakudesu_provider.get_anime_detail(anime_url)
                if details and details['episodes']:
                    otakudesu_eps_url = details['episodes'][-1]['url']
                    print(f"Using new URL: {otakudesu_eps_url}")
                    otaku_res = await otakudesu_provider.get_episode_sources(otakudesu_eps_url)

        if otaku_res:
            for source in otaku_res:
                print(f"Found source: {source}")
                url = source.get('url')
                if url:
                    resolved = await extractor.extract_raw_video(url)
                    stream_type = 'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe'
                    print(f" => Extracted: [{stream_type}] {resolved}")

    except Exception as e:
        print(f"Otakudesu error: {e}")

if __name__ == "__main__":
    asyncio.run(test_direct_extraction())
