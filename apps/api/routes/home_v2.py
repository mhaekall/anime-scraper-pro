from fastapi import APIRouter, Response
from db.connection import database
import json

router = APIRouter()

@router.get("/v2/home")
async def get_home_v2(response: Response):
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=86400"
    """
    Return homepage data exclusively from our database (datacenter).
    Ensures we only show anime that actually exist in our DB and have episodes.
    """
    # 1. Hero / Trending: highest trending anime that have episodes
    hero_rows = await database.fetch_all('''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."synopsis", m."score", m."nextAiringEpisode"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.trending DESC NULLS LAST, m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 6
    ''')

    # 2. Latest Episodes: anime with the most recently updated episodes
    latest_rows = await database.fetch_all('''
        WITH latest_eps AS (
            SELECT "anilistId", max("episodeNumber") as max_ep, max("updatedAt") as last_up
            FROM episodes
            GROUP BY "anilistId"
            ORDER BY last_up DESC
            LIMIT 15
        )
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score",
               l.max_ep as "latestEpisode"
        FROM anime_metadata m
        JOIN latest_eps l ON m."anilistId" = l."anilistId"
        ORDER BY l.last_up DESC
    ''')

    # 3. Popular: highest popularity anime all-time in our DB
    popular_rows = await database.fetch_all('''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 15
    ''')

    def format_anime(r):
        d = dict(r)
        if "nextAiringEpisode" in d and isinstance(d["nextAiringEpisode"], str):
            try:
                d["nextAiringEpisode"] = json.loads(d["nextAiringEpisode"])
            except Exception:
                pass
        return {
            "id": str(d["anilistId"]),
            "title": d.get("cleanTitle") or d.get("nativeTitle"),
            "img": d.get("coverImage"),
            "banner": d.get("bannerImage"),
            "score": d.get("score"),
            "synopsis": d.get("synopsis"),
            "nextAiringEpisode": d.get("nextAiringEpisode"),
            "url": f"/anime/{d['anilistId']}",
            "anilistId": d["anilistId"],
            "latestEpisode": d.get("latestEpisode")
        }

    return {
        "success": True,
        "data": {
            "hero": [format_anime(r) for r in hero_rows],
            "latest": [format_anime(r) for r in latest_rows],
            "popular": [format_anime(r) for r in popular_rows],
        }
    }