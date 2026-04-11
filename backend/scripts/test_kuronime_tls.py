import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.providers import kuronime_provider
from utils.extractor import UniversalExtractor

async def main():
    print("1. Searching Kuronime for 'isekai'...")
    results = await kuronime_provider.search("isekai")
    if not results:
        print("No results found for 'isekai'.")
        return
    
    anime = results[0]
    print(f"2. Found anime: {anime['title']} - URL: {anime['url']}")
    
    print(f"3. Fetching details for {anime['title']}...")
    detail = await kuronime_provider.get_anime_detail(anime['url'])
    
    if not detail.get('episodes'):
        print("No episodes found.")
        return
    
    ep = detail['episodes'][-1] # Let's get the last episode (often episode 1) to test
    print(f"4. Fetching sources for Episode {ep.get('number')} - URL: {ep.get('url')}...")
    
    sources = await kuronime_provider.get_episode_sources(ep.get('url'))
    if not sources:
        print("No sources found.")
        return
        
    print(f"Found {len(sources)} sources:")
    for s in sources:
        print(f" - {s.get('provider')} ({s.get('quality')}): {s.get('url')}")
    
    print("\n5. Testing Extractor with TLS Spoofing...")
    extractor = UniversalExtractor()
    
    tls_sources = [s for s in sources if 'streamtape' in s.get('url', '').lower() or 'mp4upload' in s.get('url', '').lower()]
    
    if tls_sources:
        test_source = tls_sources[0]
        print(f"Testing TLS Spoofing on: {test_source.get('provider')} - {test_source.get('url')}")
        raw_url = await extractor.extract_raw_video(test_source.get('url'))
        print(f"Extracted Raw URL: {raw_url}")
    else:
        print("No streamtape or mp4upload sources found to test TLS spoofing directly.")
        print("Testing extraction on the first available source anyway...")
        test_source = sources[0]
        print(f"Testing on: {test_source.get('provider')} - {test_source.get('url')}")
        raw_url = await extractor.extract_raw_video(test_source.get('url'))
        print(f"Extracted Raw URL: {raw_url}")

if __name__ == "__main__":
    asyncio.run(main())
