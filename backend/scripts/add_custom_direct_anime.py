import asyncio
import os
import sys
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import database
from services.db import upsert_mapping_atomic, upsert_anime_db
from services.pipeline import sync_anime_episodes

# Manual mappings for Direct Stream animes
TARGETS = [
    {
        "search_term": "Jujutsu Kaisen Season 2",
        "provider_id": "samehadaku",
        "provider_slug": "jujutsu-kaisen-season-3", # Samehadaku calls it Season 3
    },
    {
        "search_term": "Kimetsu no Yaiba Hashira Geiko-hen",
        "provider_id": "samehadaku",
        "provider_slug": "kimetsu-no-yaiba-the-movie-infinity-castle-part-1-akaza-returns",
    },
    {
        "search_term": "Sousou no Frieren",
        "provider_id": "samehadaku",
        "provider_slug": "sousou-no-frieren-season-2",
    }
]

ANILIST_SEARCH_QUERY = """
query ($search: String) {
  Media (search: $search, type: ANIME) {
    id
    title { romaji english native }
    coverImage { extraLarge large color }
    bannerImage
    averageScore popularity trending episodes status season seasonYear
    description(asHtml: false)
  }
}
"""

async def search_anilist(term: str):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://graphql.anilist.co",
            json={"query": ANILIST_SEARCH_QUERY, "variables": {"search": term}},
            timeout=10.0
        )
        data = resp.json()
        return data.get("data", {}).get("Media")

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

async def add_custom_direct_anime():
    await database.connect()
    
    for target in TARGETS:
        print(f"\n🚀 Processing: {target['search_term']}")
        media = await search_anilist(target['search_term'])
        
        if not media:
            print("❌ Anilist search failed.")
            continue
            
        anilist_data = format_anilist_data(media)
        aid = anilist_data["anilistId"]
        title = anilist_data["cleanTitle"]
        
        print(f"  ✅ Found on Anilist: {title} (ID: {aid})")
        
        # Upsert basic metadata
        await upsert_anime_db(anilist_data, "anilist_sync", str(aid))
        
        # Insert Mapping manually mapping to Samehadaku
        print(f"  -> Forcing mapping to {target['provider_id']} / {target['provider_slug']}")
        await upsert_mapping_atomic(
            anilist_id=aid,
            provider_id=target['provider_id'],
            provider_slug=target['provider_slug'],
            clean_title=title,
            cover_image=anilist_data["hdImage"]
        )
        
        # Sync Episodes
        print(f"  -> Syncing episodes for {aid}...")
        await sync_anime_episodes(aid)
        
    await database.disconnect()
    print("\n🎉 All Custom Direct Anime Added to DB!")

if __name__ == "__main__":
    asyncio.run(add_custom_direct_anime())
