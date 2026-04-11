import asyncio
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from db.connection import database
from services.providers import kuronime_provider
from services.anilist import fetch_anilist_info
from services.db import upsert_anime_db, upsert_mapping_atomic
from services.pipeline import sync_anime_episodes

async def main():
    await database.connect()
    try:
        print("1. Searching Kuronime for 'isekai'...")
        results = await kuronime_provider.search("isekai")
        if not results:
            print("No results found for 'isekai'.")
            return
        
        anime = results[0]
        title = anime['title']
        url = anime['url']
        slug = url.strip('/').split('/')[-1]
        
        print(f"2. Found anime on Kuronime:")
        print(f"   - Title: {title}")
        print(f"   - Link: {url}")
        print(f"   - Slug: {slug}")
        
        print(f"3. Fetching AniList metadata for '{title}'...")
        anilist_data = await fetch_anilist_info(title)
        
        if not anilist_data:
            print(f"❌ Failed to find AniList metadata for {title}")
            return
            
        aid = anilist_data["id"]
        titles = anilist_data.get("title", {})
        clean_title = titles.get("english") or titles.get("romaji")
        
        formatted_data = {
            "anilistId": aid,
            "cleanTitle": clean_title,
            "nativeTitle": titles.get("native"),
            "hdImage": anilist_data.get("coverImage", {}).get("extraLarge") or anilist_data.get("coverImage", {}).get("large"),
            "color": anilist_data.get("coverImage", {}).get("color"),
            "banner": anilist_data.get("bannerImage"),
            "score": anilist_data.get("averageScore"),
            "popularity": anilist_data.get("popularity", 0),
            "trending": anilist_data.get("trending", 0),
            "description": anilist_data.get("description"),
            "totalEpisodes": anilist_data.get("episodes"),
            "status": anilist_data.get("status"),
            "season": anilist_data.get("season"),
            "year": anilist_data.get("seasonYear")
        }
        
        print(f"4. Matched with AniList:")
        print(f"   - ID: {aid}")
        print(f"   - Clean Title: {clean_title}")
        
        print("5. Upserting into Data Center (Database)...")
        await upsert_anime_db(formatted_data, "anilist_sync", str(aid))
        
        await upsert_mapping_atomic(
            anilist_id=aid,
            provider_id="kuronime",
            provider_slug=slug,
            clean_title=clean_title,
            cover_image=formatted_data["hdImage"]
        )
        
        print("6. Synchronizing episodes from provider...")
        await sync_anime_episodes(aid)
        
        print("\n✅ Successfully added anime to the Data Center!")
        print(f"Name: {clean_title} (Original: {title})")
        print(f"AniList ID: {aid}")
        print(f"Source Link: {url}")
        
    finally:
        await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
