import asyncio
import sys
import os
import httpx

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import database
from services.db import upsert_anime_db, upsert_mapping_atomic
from services.pipeline import PROVIDERS, sync_anime_episodes
from services.queue import enqueue_sync

ANILIST_TRENDING_QUERY = """
query {
  Page(page: 1, perPage: 15) {
    media(type: ANIME, sort: TRENDING_DESC, status_in: [RELEASING, FINISHED]) {
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

async def fetch_trending_anilist():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://graphql.anilist.co",
                json={"query": ANILIST_TRENDING_QUERY},
                timeout=10.0
            )
            data = resp.json()
            return data.get("data", {}).get("Page", {}).get("media", [])
        except Exception as e:
            print(f"[SyncPopular] Failed to fetch trending from AniList: {e}")
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
    await database.connect()
    print("🚀 Starting Sync Popular Anime...")

    trending_media = await fetch_trending_anilist()
    if not trending_media:
        print("❌ No trending anime found.")
        await database.disconnect()
        return

    print(f"Found {len(trending_media)} trending anime. Processing...")

    for media in trending_media:
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
            await enqueue_sync(aid)
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

    print("\n✅ Sync Popular Anime Finished.")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(sync_popular_anime())
