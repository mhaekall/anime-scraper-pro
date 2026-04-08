import asyncio
from backend.providers.otakudesu import OtakudesuProvider

async def main():
    provider = OtakudesuProvider()
    print("Fetching ongoing...")
    try:
        ongoing = await provider.get_ongoing()
    except Exception as e:
        print(f"Exception: {e}")
        return
        
    print(f"Ongoing items: {len(ongoing) if ongoing else 0}")
    if not ongoing:
        print("Failed to fetch ongoing")
        return
    
    first_anime = ongoing[0]
    print(f"Fetching details for {first_anime['title']} ({first_anime['url']})")
    
    details = await provider.get_anime_detail(first_anime['url'])
    if not details or not details.get('episodes'):
        print("Failed to fetch details or no episodes")
        return
        
    first_episode = details['episodes'][-1] # usually the latest or first? let's just get the last one in the list (or first)
    print(f"Fetching sources for {first_episode['title']} ({first_episode['url']})")
    
    sources = await provider.get_episode_sources(first_episode['url'])
    print(f"Sources: {sources}")
    
    await provider.close()

if __name__ == "__main__":
    asyncio.run(main())