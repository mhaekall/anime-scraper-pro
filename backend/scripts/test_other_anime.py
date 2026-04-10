import asyncio
import httpx
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.extractor import UniversalExtractor
from services.providers import otakudesu_provider, oploverz_provider

async def test_other_wrappers():
    extractor = UniversalExtractor(concurrency_limit=5)
    
    print("=== Testing DesuDrives (Otakudesu) ===")
    try:
        # Search for an ongoing/popular anime on Otakudesu
        res = await otakudesu_provider.search("One Piece")
        if res:
            anime_url = res[0]['url']
            print(f"Found Anime: {anime_url}")
            details = await otakudesu_provider.get_anime_detail(anime_url)
            if details and details.get('episodes'):
                # Get the latest episode
                ep_url = details['episodes'][0]['url']
                print(f"Testing Episode URL: {ep_url}")
                
                sources = await otakudesu_provider.get_episode_sources(ep_url)
                print(f"Raw Sources: {len(sources)} found")
                
                for s in sources:
                    embed_url = s.get('url')
                    if embed_url:
                        print(f"\n  Trying to extract: {embed_url}")
                        resolved = await extractor.extract_raw_video(embed_url)
                        stream_type = 'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe'
                        print(f"  -> [{stream_type}] {resolved[:100]}...")
        else:
            print("Could not find anime on Otakudesu.")
    except Exception as e:
        print(f"Error testing Otakudesu: {e}")

    print("\n=== Testing 4meplayer/Oplo2 (Oploverz) ===")
    try:
        # Search for an ongoing/popular anime on Oploverz
        res = await oploverz_provider.search("One Piece")
        if res:
            anime_url = res[0]['url']
            print(f"Found Anime: {anime_url}")
            details = await oploverz_provider.get_anime_detail(anime_url)
            if details and details.get('episodes'):
                # Get the latest episode
                ep_url = details['episodes'][0]['url']
                print(f"Testing Episode URL: {ep_url}")
                
                sources = await oploverz_provider.get_episode_sources(ep_url)
                # Oploverz returns dict with 'sources' and 'downloads'
                src_list = sources.get('sources', [])
                print(f"Raw Sources: {len(src_list)} found")
                
                for s in src_list:
                    embed_url = s.get('url')
                    if embed_url:
                        print(f"\n  Trying to extract: {embed_url}")
                        resolved = await extractor.extract_raw_video(embed_url)
                        stream_type = 'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe'
                        print(f"  -> [{stream_type}] {resolved[:100]}...")
        else:
            print("Could not find anime on Oploverz.")
    except Exception as e:
        print(f"Error testing Oploverz: {e}")

if __name__ == "__main__":
    asyncio.run(test_other_wrappers())
