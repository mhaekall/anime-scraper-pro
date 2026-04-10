import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.extractor import UniversalExtractor
from services.providers import otakudesu_provider, oploverz_provider

async def test_wrappers():
    extractor = UniversalExtractor(concurrency_limit=5)
    
    print("=== Testing DesuDrives (Otakudesu) ===")
    try:
        search_res = await otakudesu_provider.search("One Piece")
        if search_res:
            anime_url = search_res[0]['url']
            print(f"Found Anime: {anime_url}")
            details = await otakudesu_provider.get_anime_detail(anime_url)
            if details and details.get('episodes'):
                otakudesu_url = details['episodes'][0]['url'] # Get latest episode
                print(f"Testing URL: {otakudesu_url}")
                sources = await otakudesu_provider.get_episode_sources(otakudesu_url)
                print(f"Found {len(sources)} sources.")
                for s in sources:
                    embed_url = s.get('url')
                    if embed_url:
                        print(f"  -> Trying to extract: {embed_url}")
                        resolved = await extractor.extract_raw_video(embed_url)
                        stream_type = 'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe'
                        print(f"     [{stream_type}] {resolved}")
    except Exception as e:
        print(f"Error testing Otakudesu: {e}")

    print("\n=== Testing 4meplayer/Oplo2 (Oploverz) ===")
    try:
        search_res = await oploverz_provider.search("One Piece")
        if search_res:
            anime_url = search_res[0]['url']
            print(f"Found Anime: {anime_url}")
            details = await oploverz_provider.get_anime_detail(anime_url)
            if details and details.get('episodes'):
                oploverz_url = details['episodes'][0]['url']
                print(f"Testing URL: {oploverz_url}")
                sources = await oploverz_provider.get_episode_sources(oploverz_url)
                # sources is a list of dicts
                print(f"Found {len(sources)} sources.")
                for s in sources:
                    embed_url = s.get('url')
                    if embed_url:
                        print(f"  -> Trying to extract: {embed_url}")
                        resolved = await extractor.extract_raw_video(embed_url)
                        stream_type = 'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe'
                        print(f"     [{stream_type}] {resolved}")
    except Exception as e:
        print(f"Error testing Oploverz: {e}")

if __name__ == "__main__":
    asyncio.run(test_wrappers())
