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
    # Run queries concurrently to save round-trips
    import asyncio
    
    hero_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."synopsis", m."score", m."nextAiringEpisode"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.trending DESC NULLS LAST, m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 10
    '''
    
    airing_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score", m."nextAiringEpisode"
        FROM anime_metadata m
        WHERE m.status = 'RELEASING' AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.popularity DESC NULLS LAST
        LIMIT 20
    '''
    
    latest_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score",
               max(e."episodeNumber") as "latestEpisode",
               max(e."updatedAt") as last_up
        FROM anime_metadata m
        JOIN episodes e ON m."anilistId" = e."anilistId"
        WHERE (m.year >= 2026 OR m.year IS NULL) AND m.status = 'RELEASING'
        GROUP BY m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        ORDER BY last_up DESC
        LIMIT 20
    '''
    
    popular_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 20
    '''

    completed_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score", m."totalEpisodes"
        FROM anime_metadata m
        WHERE m.status = 'FINISHED' AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.popularity DESC NULLS LAST, m.score DESC NULLS LAST
        LIMIT 20
    '''

    top_rated_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.score DESC NULLS LAST, m.popularity DESC NULLS LAST
        LIMIT 20
    '''

    isekai_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        FROM anime_metadata m
        WHERE m.genres::text ILIKE '%fantasy%' AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.popularity DESC NULLS LAST
        LIMIT 20
    '''

    movies_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        FROM anime_metadata m
        WHERE m."totalEpisodes" = 1 AND EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.popularity DESC NULLS LAST
        LIMIT 20
    '''

    trending_query = '''
        SELECT m."anilistId", m."cleanTitle", m."nativeTitle", m."coverImage", m."bannerImage", m."score"
        FROM anime_metadata m
        WHERE EXISTS (SELECT 1 FROM episodes e WHERE e."anilistId" = m."anilistId")
        ORDER BY m.trending DESC NULLS LAST, m.popularity DESC NULLS LAST
        LIMIT 20
    '''

    hero_rows, airing_rows, latest_rows, popular_rows, completed_rows, top_rated_rows, isekai_rows, movies_rows, trending_rows = await asyncio.gather(
        database.fetch_all(hero_query),
        database.fetch_all(airing_query),
        database.fetch_all(latest_query),
        database.fetch_all(popular_query),
        database.fetch_all(completed_query),
        database.fetch_all(top_rated_query),
        database.fetch_all(isekai_query),
        database.fetch_all(movies_query),
        database.fetch_all(trending_query)
    )

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
            "latestEpisode": d.get("latestEpisode"),
            "episodes": d.get("totalEpisodes")
        }

    return {
        "success": True,
        "data": {
            "hero": [format_anime(r) for r in hero_rows],
            "airing": [format_anime(r) for r in airing_rows],
            "latest": [format_anime(r) for r in latest_rows],
            "popular": [format_anime(r) for r in popular_rows],
            "completed": [format_anime(r) for r in completed_rows],
            "top_rated": [format_anime(r) for r in top_rated_rows],
            "isekai": [format_anime(r) for r in isekai_rows],
            "movies": [format_anime(r) for r in movies_rows],
            "trending": [format_anime(r) for r in trending_rows],
        }
    }