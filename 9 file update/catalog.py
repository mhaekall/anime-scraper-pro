"""
catalog.py — Clean v2 API that uses anilistId as the universal primary key.

Why v2?
  The v1 API (/api/scrape, /api/multi-source, etc.) mixed oploverz slugs with
  AniList IDs and scraped on-demand.  v2 always uses anilistId, reads structured
  data from the DB, and only hits provider sites when the cache is cold.

Endpoints
─────────
GET  /api/v2/anime/{anilist_id}
     Full anime detail + episode list.  Triggers a background sync if the
     episode list is empty so the next request will be fast.

GET  /api/v2/anime/{anilist_id}/episodes/{ep_num}/stream
     Returns playable video sources for a specific episode.
     Uses video_cache; re-scrapes only when cache is stale (> 6 hours).

POST /api/v2/anime/{anilist_id}/sync
     Manually trigger an episode sync.  Useful after a new season drops.

GET  /api/v2/search?q=...
     Search AniList and enrich with our DB mapping data.

GET  /api/v2/anime/{anilist_id}/episodes
     Just the episode list (lighter response for the episode-list component).
"""

import asyncio
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from db.connection import database
from services.pipeline import (
    get_anime_detail,
    get_episode_stream,
    sync_anime_episodes,
    ensure_episodes_exist,
    get_provider_mappings,
)
from services.anilist import fetch_anilist_info
from services.db import upsert_anime_db
from services.cache import swr_cache_get

router = APIRouter()


# ── GET /api/v2/anime/{anilist_id} ─────────────────────────────────────────────

@router.get("/v2/anime/{anilist_id}")
async def get_anime_v2(anilist_id: int, background_tasks: BackgroundTasks):
    """
    Full anime detail with episode list.

    1. Look up anime in DB.
    2. If not in DB, fetch from AniList and save it.
    3. If episodes are missing, sync them in the background and return what we have.
    """
    # Fetch from DB (fast path)
    data = await get_anime_detail(anilist_id)

    # Not in DB at all — try AniList
    if data is None:
        anilist_data = await _fetch_and_save_anilist(anilist_id)
        if not anilist_data:
            raise HTTPException(status_code=404, detail=f"Anime {anilist_id} not found on AniList")
        # Try DB again after saving
        data = await get_anime_detail(anilist_id)
        if data is None:
            raise HTTPException(status_code=404, detail="Anime saved but could not be read back")

    # Episodes empty — sync in background so next request is fast
    if not data.get("episodes"):
        background_tasks.add_task(sync_anime_episodes, anilist_id)
        # Return metadata without episodes rather than a 404
        return {
            "success": True,
            "syncing": True,
            "message": "Episode list is being fetched. Please refresh in ~10 seconds.",
            "data": data,
        }

    return {"success": True, "data": data}


# ── GET /api/v2/anime/{anilist_id}/episodes ────────────────────────────────────

@router.get("/v2/anime/{anilist_id}/episodes")
async def get_episodes_v2(anilist_id: int, background_tasks: BackgroundTasks):
    """Lightweight endpoint: only the episode list."""
    has_eps = await ensure_episodes_exist(anilist_id)
    if not has_eps:
        # Kick off a sync but don't block
        background_tasks.add_task(sync_anime_episodes, anilist_id)
        return {"success": False, "syncing": True, "data": []}

    rows = await database.fetch_all(
        """
        SELECT DISTINCT ON ("episodeNumber")
               "episodeNumber", "episodeTitle", "episodeUrl", "providerId", "thumbnailUrl"
        FROM   episodes
        WHERE  "anilistId" = :id
        ORDER  BY "episodeNumber" DESC,
               CASE "providerId" WHEN 'oploverz' THEN 1 WHEN 'otakudesu' THEN 2 ELSE 3 END
        """,
        values={"id": anilist_id},
    )
    return {"success": True, "data": [dict(r) for r in rows]}


# ── GET /api/v2/anime/{anilist_id}/episodes/{ep_num}/stream ────────────────────

@router.get("/v2/anime/{anilist_id}/episodes/{ep_num}/stream")
async def get_episode_stream_v2(anilist_id: int, ep_num: str):
    """
    Return resolved video sources for one episode.

    ep_num can be "1", "12", "12.5" (floats for OVAs / specials).
    Sources come from video_cache when fresh; re-scrapes when stale.
    """
    try:
        ep_float = float(ep_num)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid episode number: {ep_num}")

    result = await get_episode_stream(anilist_id, ep_float)

    if result is None:
        # Episode not in DB — maybe not synced yet
        has_eps = await ensure_episodes_exist(anilist_id)
        if has_eps:
            result = await get_episode_stream(anilist_id, ep_float)

    if not result or not result.get("sources"):
        raise HTTPException(
            status_code=503,
            detail=f"No video sources available for episode {ep_num}. "
                   "Sources may still be resolving — try again in a few seconds.",
        )

    return {"success": True, **result}


# ── POST /api/v2/anime/{anilist_id}/sync ───────────────────────────────────────

@router.post("/v2/anime/{anilist_id}/sync")
async def trigger_sync_v2(anilist_id: int, background_tasks: BackgroundTasks):
    """
    Manually trigger a full episode sync for an anime.
    Runs asynchronously — returns immediately.
    """
    background_tasks.add_task(sync_anime_episodes, anilist_id)
    return {
        "success": True,
        "message": f"Episode sync started for anilist_id={anilist_id}",
    }


# ── GET /api/v2/search ─────────────────────────────────────────────────────────

@router.get("/v2/search")
async def search_v2(
    q: str = Query(..., min_length=2, description="Search query"),
    background_tasks: BackgroundTasks = None,
):
    """
    Search AniList and return results enriched with local DB status.

    Each result includes:
      - hasMapping: whether we already have provider mappings for it
      - providers: which providers we know about
      - hasEpisodes: whether the episode list is populated
    """
    cache_key = f"search_v2:{q}"

    async def do_search():
        from services.anilist import fetch_anilist_info  # local import to avoid circulars
        result = await fetch_anilist_info(q)
        if not result:
            return []

        anilist_id = result["anilistId"]
        mappings = await get_provider_mappings(anilist_id)

        count_row = await database.fetch_one(
            'SELECT COUNT(*) as cnt FROM episodes WHERE "anilistId" = :id',
            values={"id": anilist_id},
        )
        has_eps = count_row and count_row["cnt"] > 0

        # Save to DB in the background if new
        if not mappings and background_tasks:
            background_tasks.add_task(upsert_anime_db, result, "anilist_search", str(anilist_id))

        return [{
            **result,
            "hasMapping":  len(mappings) > 0,
            "providers":   list(mappings.keys()),
            "hasEpisodes": has_eps,
            # Canonical frontend route — always uses anilistId
            "detailUrl":   f"/anime/{anilist_id}",
        }]

    data = await swr_cache_get(cache_key, do_search, ttl=600, swr=3600)
    return {"success": True, "data": data or []}


# ── GET /api/v2/anime/{anilist_id}/mappings ────────────────────────────────────

@router.get("/v2/anime/{anilist_id}/mappings")
async def get_mappings_v2(anilist_id: int):
    """Debug endpoint: show all provider mappings for an anime."""
    mappings = await get_provider_mappings(anilist_id)
    return {"success": True, "anilistId": anilist_id, "mappings": mappings}


# ── internal helpers ───────────────────────────────────────────────────────────

async def _fetch_and_save_anilist(anilist_id: int) -> Optional[dict]:
    """
    Fetch a specific anime by its AniList ID (not by title).
    We query AniList with the numeric ID rather than doing a title search.
    """
    from services.clients import client

    QUERY = """
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        coverImage { extraLarge large color }
        bannerImage
        averageScore episodes status season seasonYear
        description(asHtml: false)
        genres
        studios { nodes { name isAnimationStudio } }
        recommendations { nodes { mediaRecommendation { id title { romaji english } coverImage { large } } } }
        nextAiringEpisode { episode timeUntilAiring }
      }
    }
    """
    try:
        resp = await client.post(
            "https://graphql.anilist.co",
            json={"query": QUERY, "variables": {"id": anilist_id}},
        )
        media = resp.json().get("data", {}).get("Media")
        if not media:
            return None

        studios = [s["name"] for s in media.get("studios", {}).get("nodes", []) if s.get("isAnimationStudio")]
        recs = [
            {
                "id": r["mediaRecommendation"]["id"],
                "title": r["mediaRecommendation"]["title"].get("english") or r["mediaRecommendation"]["title"].get("romaji"),
                "cover": r["mediaRecommendation"]["coverImage"]["large"],
            }
            for r in media.get("recommendations", {}).get("nodes", [])
            if r.get("mediaRecommendation")
        ]

        result = {
            "anilistId":        media["id"],
            "cleanTitle":       media["title"].get("english") or media["title"].get("romaji"),
            "nativeTitle":      media["title"].get("native"),
            "hdImage":          media["coverImage"].get("extraLarge") or media["coverImage"].get("large"),
            "color":            media["coverImage"].get("color"),
            "banner":           media.get("bannerImage"),
            "score":            media.get("averageScore"),
            "description":      media.get("description"),
            "genres":           media.get("genres", []),
            "episodes":         media.get("episodes"),
            "status":           media.get("status"),
            "season":           media.get("season"),
            "seasonYear":       media.get("seasonYear"),
            "studios":          studios,
            "recommendations":  recs,
            "nextAiringEpisode": media.get("nextAiringEpisode"),
        }

        # Save to DB
        await upsert_anime_db(result, "anilist_search", str(anilist_id))
        return result

    except Exception as e:
        print(f"[Catalog] _fetch_and_save_anilist error for {anilist_id}: {e}")
        return None
