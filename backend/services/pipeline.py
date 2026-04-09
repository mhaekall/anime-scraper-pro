"""
pipeline.py — Central data pipeline for the anime platform.

Responsibilities
----------------
1. sync_anime_episodes(anilist_id)
   Walk all provider mappings for an anime, scrape episode lists, and upsert
   into the `episodes` table.  Run this once per day per anime (or on-demand
   when a user hits a detail page that has no episodes yet).

2. resolve_episode_sources(episode_url, provider_id)
   Turn a provider episode page URL into a list of raw playable video URLs.
   Results are cached in `video_cache` with a 6-hour TTL so re-plays are fast.

3. get_anime_detail(anilist_id)
   Return anime metadata + a clean, de-duplicated, sorted episode list from DB.

4. get_episode_stream(anilist_id, ep_num)
   Find the best provider episode for this anilist_id+ep_num combo, resolve
   sources (using cache when possible), and return them ready for the player.
"""

import asyncio
import json
import re
import urllib.parse
import time
from datetime import datetime, timedelta
from typing import Optional

from db.connection import database
from utils.distributed_lock import DistributedLock
from services.cache import upstash_get, upstash_set, upstash_del
from services.providers import (
    oploverz_provider,
    otakudesu_provider,
    samehadaku_provider,
    doronime_provider,
    extractor,
)

# ── provider registry ──────────────────────────────────────────────────────────

PROVIDERS = {
    "oploverz":   oploverz_provider,
    "otakudesu":  otakudesu_provider,
    "samehadaku": samehadaku_provider,
    "doronime":   doronime_provider,
}

# Priority when multiple providers have the same episode.
# Lower number = higher priority.
PROVIDER_PRIORITY = {"otakudesu": 1, "samehadaku": 2, "doronime": 3, "oploverz": 4}

SOURCE_CACHE_HOURS = 6

# ── helpers ────────────────────────────────────────────────────────────────────

def extract_episode_number(title: str) -> Optional[float]:
    """
    Parse episode number from strings like:
      'Episode 12', 'Eps 12.5', 'OVA 1', 'Specials 1', '1', 'Ep.12'
    Returns float or None.
    """
    if not title:
        return None
    # Named pattern: Episode / Eps / Ep + number
    m = re.search(r"(?:episode|eps?)[.\s]*(\d+(?:[.,]\d+)?)", title, re.IGNORECASE)
    if m:
        return float(m.group(1).replace(",", "."))
    # OVA / Special / Movie: treat as 0.5, 0.6, etc. (won't conflict with regular eps)
    if re.search(r"\b(ova|specials?|movie)\b", title, re.IGNORECASE):
        m2 = re.search(r"(\d+)", title)
        return float(f"0.{m2.group(1)}") if m2 else 0.0
    # Bare number at the start or end
    m3 = re.search(r"^\s*(\d+(?:[.,]\d+)?)\s*$", title.strip())
    if m3:
        return float(m3.group(1).replace(",", "."))
    return None


def build_provider_series_url(provider_id: str, provider_slug: str) -> str:
    """Build the series page URL for a given provider + slug."""
    bases = {
        "oploverz":  "https://o.oploverz.ltd/series/{slug}/",
        "otakudesu": "https://otakudesu.cloud/anime/{slug}/",
        "samehadaku": "https://v2.samehadaku.how/anime/{slug}/",
        "doronime":  "https://doronime.id/{slug}/",
    }
    template = bases.get(provider_id, "")
    return template.format(slug=provider_slug) if template else ""


# ── DB helpers ─────────────────────────────────────────────────────────────────

async def get_provider_mappings(anilist_id: int) -> dict:
    """Return {providerId: providerSlug} for every known provider of this anime."""
    rows = await database.fetch_all(
        'SELECT "providerId", "providerSlug" FROM anime_mappings WHERE "anilistId" = :id',
        values={"id": anilist_id},
    )
    return {r["providerId"]: r["providerSlug"] for r in rows}


async def upsert_episode(
    anilist_id: int,
    provider_id: str,
    ep_num: float,
    ep_url: str,
    ep_title: Optional[str] = None,
    thumbnail: Optional[str] = None,
) -> None:
    await database.execute(
        """
        INSERT INTO episodes
            ("anilistId", "providerId", "episodeNumber", "episodeTitle", "episodeUrl", "thumbnailUrl", "updatedAt")
        VALUES
            (:anilist_id, :provider_id, :ep_num, :ep_title, :ep_url, :thumbnail, NOW())
        ON CONFLICT ("anilistId", "providerId", "episodeNumber")
        DO UPDATE SET
            "episodeUrl"   = EXCLUDED."episodeUrl",
            "episodeTitle" = EXCLUDED."episodeTitle",
            "thumbnailUrl" = COALESCE(EXCLUDED."thumbnailUrl", episodes."thumbnailUrl"),
            "updatedAt"    = NOW()
        """,
        values={
            "anilist_id": anilist_id,
            "provider_id": provider_id,
            "ep_num": ep_num,
            "ep_title": ep_title,
            "ep_url": ep_url,
            "thumbnail": thumbnail,
        },
    )


async def get_video_cache(episode_url: str) -> Optional[dict]:
    row = await database.fetch_one(
        'SELECT payload FROM video_cache WHERE "episodeUrl" = :url AND "expiresAt" > NOW()',
        values={"url": episode_url},
    )
    if row and row["payload"]:
        raw = row["payload"]
        return raw if isinstance(raw, dict) else json.loads(raw)
    return None


async def save_video_cache(episode_url: str, provider_id: str, payload: dict) -> None:
    expires = datetime.utcnow() + timedelta(hours=SOURCE_CACHE_HOURS)
    await database.execute(
        """
        INSERT INTO video_cache ("episodeUrl", "providerId", payload, "expiresAt", "updatedAt")
        VALUES (:url, :provider_id, :payload, :expires, NOW())
        ON CONFLICT ("episodeUrl")
        DO UPDATE SET
            payload     = EXCLUDED.payload,
            "expiresAt" = EXCLUDED."expiresAt",
            "updatedAt" = NOW()
        """,
        values={
            "url": episode_url,
            "provider_id": provider_id,
            "payload": json.dumps(payload),
            "expires": expires,
        },
    )


# ── core pipeline functions ────────────────────────────────────────────────────

async def sync_anime_episodes(anilist_id: int) -> dict:
    """
    Fetch episode lists from all known providers for this anime and store them.
    Returns {"synced": N, "providers": [...], "errors": [...]}
    """
    mappings = await get_provider_mappings(anilist_id)
    if not mappings:
        return {"synced": 0, "providers": [], "errors": ["No provider mappings found"]}

    synced_total = 0
    providers_done = []
    errors = []

    lock = DistributedLock(
        upstash_get_fn=upstash_get,
        upstash_set_fn=upstash_set,
        upstash_del_fn=upstash_del,
        key=f"sync_anime:{anilist_id}",
        timeout=120
    )

    try:
        async with lock:
            for provider_id, provider_slug in mappings.items():
                provider = PROVIDERS.get(provider_id)
                if not provider:
                    errors.append(f"Unknown provider: {provider_id}")
                    continue

                series_url = build_provider_series_url(provider_id, provider_slug)
                if not series_url:
                    errors.append(f"Cannot build URL for {provider_id}")
                    continue

                try:
                    detail = await provider.get_anime_detail(series_url)
                    raw_episodes = detail.get("episodes", [])
                    print(f"[Pipeline Debug] Fetched {len(raw_episodes)} episodes from {series_url}")

                    sem = asyncio.Semaphore(5)
                    count = 0

                    async def process_ep(ep: dict):
                        nonlocal count
                        ep_num = extract_episode_number(ep.get("title", ""))
                        if ep_num is None:
                            return
                        async with sem:
                            await upsert_episode(
                                anilist_id=anilist_id,
                                provider_id=provider_id,
                                ep_num=ep_num,
                                ep_url=ep["url"],
                                ep_title=ep.get("title"),
                                thumbnail=ep.get("thumbnail"),
                            )
                            count += 1

                    await asyncio.gather(*(process_ep(ep) for ep in raw_episodes))
                    synced_total += count
                    providers_done.append(provider_id)
                    print(f"[Pipeline] Synced {count} episodes from {provider_id} for anilist_id={anilist_id}")

                except Exception as e:
                    error_msg = f"{provider_id}: {str(e)}"
                    errors.append(error_msg)
                    print(f"[Pipeline] Sync error — {error_msg}")
    except TimeoutError:
        print(f"[Pipeline] Another sync is already in progress for anilist_id={anilist_id}")
        errors.append("Sync already in progress")

    return {"synced": synced_total, "providers": providers_done, "errors": errors}


async def resolve_episode_sources(episode_url: str, provider_id: str) -> dict:
    """
    Resolve a provider episode page URL to a list of playable video sources.

    Flow:
      1. Check video_cache table — return immediately if fresh.
      2. Call provider.get_episode_sources() to get raw embed/iframe URLs.
      3. Feed each raw URL through UniversalExtractor to get the actual .m3u8 / .mp4.
      4. Filter out anything that didn't resolve to a direct video URL.
      5. Sort by quality, persist to cache, and return.

    Returns:
      {"sources": [{provider, quality, url, type}], "downloads": [...]}
    """
    # 1. Cache hit
    cached = await get_video_cache(episode_url)
    if cached:
        print(f"[Pipeline] Cache hit for {episode_url}")
        return cached

    provider = PROVIDERS.get(provider_id)
    if not provider:
        return {"sources": [], "downloads": []}

    try:
        raw_result = await provider.get_episode_sources(episode_url)

        # Normalize: providers return either a list or {"sources": [...], "downloads": [...]}
        if isinstance(raw_result, list):
            raw_sources = raw_result
            downloads = []
        else:
            raw_sources = raw_result.get("sources", [])
            downloads = raw_result.get("downloads", [])

        if not raw_sources:
            return {"sources": [], "downloads": downloads}

        # 2-3. Resolve all sources concurrently (max 4 at a time)
        sem = asyncio.Semaphore(4)

        async def resolve_one(src: dict) -> Optional[dict]:
            raw_url = src.get("url") or src.get("resolved", "")
            if not raw_url:
                return None
            
            async with sem:
                resolved = await extractor.extract_raw_video(raw_url)

            # Accept as-is if it looks like a direct video already
            is_direct = (
                any(resolved.split("?")[0].endswith(ext) for ext in (".m3u8", ".mp4", ".webm"))
                or "googlevideo.com/videoplayback" in resolved
                or ".mp4" in resolved
                or ".m3u8" in resolved
            )
            
            if not is_direct:
                # If extraction failed to get a direct video link, keep it as an iframe
                # provided it's a known embed domain
                video_type = "iframe"
                final_url = raw_url
            else:
                video_type = "hls" if ".m3u8" in resolved else "mp4"
                final_url = resolved

            return {
                "provider": src.get("provider") or src.get("domain") or provider_id,
                "quality":  src.get("quality", "Auto"),
                "url":      final_url,
                "type":     video_type,
                "source":   provider_id,
            }

        tasks = [resolve_one(s) for s in raw_sources]
        resolved_list = await asyncio.gather(*tasks)
        final_sources = [s for s in resolved_list if s is not None]

        # 4. Sort by quality
        quality_rank = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}
        final_sources.sort(key=lambda x: quality_rank.get(x["quality"], 0), reverse=True)

        payload = {"sources": final_sources, "downloads": downloads}

        # 5. Cache
        if final_sources:
            await save_video_cache(episode_url, provider_id, payload)

        return payload

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[Pipeline] resolve_episode_sources error for {episode_url}: {e}")
        return {"sources": [], "downloads": []}


async def get_anime_detail(anilist_id: int) -> Optional[dict]:
    """
    Return anime metadata from DB + a clean episode list.

    Episode list rules:
      - De-duplicated by episodeNumber — if multiple providers have ep 5,
        we pick the one with the highest provider priority (oploverz > otakudesu > …).
      - Sorted descending (newest first, like a normal anime site).
      - Each episode carries its provider so the stream endpoint knows which
        scraper to call.
    """
    meta = await database.fetch_one(
        'SELECT * FROM anime_metadata WHERE "anilistId" = :id',
        values={"id": anilist_id},
    )
    if not meta:
        return None

    # DISTINCT ON picks the first row per episodeNumber after ORDER BY priority
    eps = await database.fetch_all(
        """
        SELECT DISTINCT ON ("episodeNumber")
               "episodeNumber", "episodeTitle", "episodeUrl", "providerId", "thumbnailUrl"
        FROM   episodes
        WHERE  "anilistId" = :id
        ORDER  BY
               "episodeNumber" DESC,
               CASE "providerId"
                 WHEN 'otakudesu'  THEN 1
                 WHEN 'samehadaku' THEN 2
                 WHEN 'doronime'   THEN 3
                 WHEN 'oploverz'   THEN 4
                 ELSE 99
               END
        """,
        values={"id": anilist_id},
    )

    meta_dict = dict(meta)
    
    # Parse JSON columns since they might be returned as strings
    import json
    for col in ["genres", "studios", "recommendations", "nextAiringEpisode"]:
        if col in meta_dict and isinstance(meta_dict[col], str):
            try:
                meta_dict[col] = json.loads(meta_dict[col])
            except Exception:
                pass

    return {
        **meta_dict,
        "episodes": [dict(e) for e in eps],
    }


async def get_episode_stream(anilist_id: int, ep_num: float) -> Optional[dict]:
    """
    Get playable sources for anilistId + episodeNumber.
    Falls back to trying secondary providers if the primary one fails.
    """
    # Get all providers for this episode, ordered by priority
    rows = await database.fetch_all(
        """
        SELECT "episodeUrl", "providerId"
        FROM   episodes
        WHERE  "anilistId" = :anilist_id AND "episodeNumber" = :ep_num
        ORDER  BY
               CASE "providerId"
                 WHEN 'otakudesu'  THEN 1
                 WHEN 'samehadaku' THEN 2
                 WHEN 'doronime'   THEN 3
                 WHEN 'oploverz'   THEN 4
                 ELSE 99
               END
        """,
        values={"anilist_id": anilist_id, "ep_num": ep_num},
    )

    if not rows:
        return None

    for row in rows:
        result = await resolve_episode_sources(row["episodeUrl"], row["providerId"])
        if result.get("sources"):
            result["episodeUrl"] = row["episodeUrl"]
            result["usedProvider"] = row["providerId"]
            return result

    return {"sources": [], "downloads": [], "error": "No sources resolved from any provider"}


async def ensure_episodes_exist(anilist_id: int) -> bool:
    """
    Check whether we have episodes in DB for this anime.
    If not, trigger a sync and wait for it (up to 30s).
    Returns True if episodes now exist.
    """
    count_row = await database.fetch_one(
        'SELECT COUNT(*) as cnt FROM episodes WHERE "anilistId" = :id',
        values={"id": anilist_id},
    )
    if count_row and count_row["cnt"] > 0:
        return True

    # No episodes — sync now
    print(f"[Pipeline] No episodes for anilist_id={anilist_id}, syncing…")
    result = await sync_anime_episodes(anilist_id)
    return result["synced"] > 0
