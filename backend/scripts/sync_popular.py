import asyncio
import sys
import os
import httpx

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import database
from services.db import upsert_anime_db, upsert_mapping_atomic
from services.pipeline import PROVIDERS, sync_anime_episodes
from services.queue import enqueue_sync

ANILIST_QUERY = """
query($sort: [MediaSort]) {
  Page(page: 1, perPage: 30) {
    media(type: ANIME, sort: $sort, status_in: [RELEASING, FINISHED]) {
      id
      title { romaji english native }
      coverImage { extraLarge large color }
      bannerImage
      averageScore popularity trending episodes status season seasonYear
      description(asHtml: false)
    }
  }
}
"""

async def fetch_anilist_list(sort_type):
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://graphql.anilist.co",
                json={"query": ANILIST_QUERY, "variables": {"sort": [sort_type]}},
                timeout=10.0
            )
            data = resp.json()
            return data.get("data", {}).get("Page", {}).get("media", [])
        except Exception as e:
            print(f"[SyncPopular] Failed to fetch {sort_type} from AniList: {e}")
            return []

def format_anilist_data(media):
    return {
        "anilistId": media["id"],
        "cleanTitle": media["title"].get("english") or media["title"].get("romaji"),
        "nativeTitle": media["title"].get("native"),
        "hdImage": media["coverImage"].get("extraLarge") or media["coverImage"].get("large"),
        "color": media["coverImage"].get("color"),
        "banner": media.get("bannerImage"),
        "score": media.get("averageScore"),
        "popularity": media.get("popularity", 0),
        "trending": media.get("trending", 0),
        "description": media.get("description"),
        "totalEpisodes": media.get("episodes"),
        "status": media.get("status"),
        "season": media.get("season"),
        "year": media.get("seasonYear")
    }

async def sync_popular_anime():
    print("🚀 Starting Sync Popular & Trending Anime...")

    trending_media = await fetch_anilist_list("TRENDING_DESC")
    popular_media = await fetch_anilist_list("POPULARITY_DESC")
    
    all_media = {m["id"]: m for m in trending_media + popular_media}.values() # Deduplicate by ID
    
    if not all_media:
        print("❌ No anime found.")
        return

    print(f"Found {len(all_media)} unique trending/popular anime. Processing...")

    for media in all_media:
        anilist_data = format_anilist_data(media)
        aid = anilist_data["anilistId"]
        title = anilist_data["cleanTitle"]
        print(f"\nProcessing: {title} (ID: {aid})")

        # 1. Upsert basic metadata
        await upsert_anime_db(anilist_data, "anilist_sync", str(aid))

        # 2. Check existing mappings
        existing = await database.fetch_one('SELECT 1 FROM anime_mappings WHERE "anilistId" = :id', {"id": aid})
        if existing:
            print(f"  -> Already mapped. Triggering episode sync...")
            await sync_anime_episodes(aid)
            continue

        # 3. No mappings found, search providers
        found_mapping = False
        for prov_id, provider in PROVIDERS.items():
            if not hasattr(provider, 'search'):
                continue
            
            print(f"  -> Searching {prov_id} for '{title}'...")
            try:
                # Use a timeout so one provider doesn't hang the whole script
                async with asyncio.timeout(10.0):
                    search_results = await provider.search(title)
                
                if search_results:
                    best_match = search_results[0]
                    # Extract slug from URL depending on provider structure
                    url = best_match['url'].strip('/')
                    slug = url.split('/')[-1]
                    
                    if slug:
                        print(f"     ✅ Found match on {prov_id}: {slug}")
                        await upsert_mapping_atomic(
                            anilist_id=aid,
                            provider_id=prov_id,
                            provider_slug=slug,
                            clean_title=title,
                            cover_image=anilist_data["hdImage"]
                        )
                        found_mapping = True
                        break # Found one good mapping, break out of provider loop
            except Exception as e:
                print(f"     ❌ Search error on {prov_id}: {e}")

        if found_mapping:
            print(f"  -> Mapping saved. Triggering episode sync...")
            await sync_anime_episodes(aid)
        else:
            print(f"  -> ⚠️ Could not find any provider mappings for {title}")

    print("\n✅ Sync Anime Finished.")

async def main():
    await database.connect()
    await sync_popular_anime()
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
