from db.connection import database
from db.models import anime_mappings, anime_metadata

async def upsert_anime_db(anilist_data, provider_id: str, provider_slug: str):
    if not anilist_data or not anilist_data.get('anilistId'):
        return
    try:
        query_meta = """
            INSERT INTO anime_metadata ("anilistId", "cleanTitle", "nativeTitle", "coverImage", "bannerImage", "synopsis", "score", "status", "totalEpisodes", "season", "year", "updatedAt")
            VALUES (:anilistId, :cleanTitle, :nativeTitle, :coverImage, :bannerImage, :synopsis, :score, :status, :totalEpisodes, :season, :year, NOW())
            ON CONFLICT ("anilistId") DO UPDATE SET
                "cleanTitle" = EXCLUDED."cleanTitle",
                "nativeTitle" = EXCLUDED."nativeTitle",
                "coverImage" = EXCLUDED."coverImage",
                "bannerImage" = EXCLUDED."bannerImage",
                "synopsis" = EXCLUDED."synopsis",
                "score" = EXCLUDED."score",
                "status" = EXCLUDED."status",
                "totalEpisodes" = EXCLUDED."totalEpisodes",
                "season" = EXCLUDED."season",
                "year" = EXCLUDED."year",
                "updatedAt" = NOW()
        """
        await database.execute(query=query_meta, values={
            'anilistId': anilist_data.get('anilistId'),
            'cleanTitle': anilist_data.get('cleanTitle', ''),
            'nativeTitle': anilist_data.get('nativeTitle', ''),
            'coverImage': anilist_data.get('hdImage', ''),
            'bannerImage': anilist_data.get('banner', ''),
            'synopsis': anilist_data.get('description', ''),
            'score': anilist_data.get('score'),
            'status': anilist_data.get('status', ''),
            'totalEpisodes': anilist_data.get('totalEpisodes'),
            'season': anilist_data.get('season', ''),
            'year': anilist_data.get('year')
        })
        
        query_map = """
            INSERT INTO anime_mappings ("anilistId", "providerId", "providerSlug", "updatedAt")
            VALUES (:anilistId, :providerId, :providerSlug, NOW())
            ON CONFLICT ("providerId", "providerSlug") DO UPDATE SET
                "anilistId" = EXCLUDED."anilistId",
                "updatedAt" = NOW()
        """
        await database.execute(query=query_map, values={
            'anilistId': anilist_data.get('anilistId'),
            'providerId': provider_id,
            'providerSlug': provider_slug
        })
    except Exception as e:
        print(f"[DB Upsert Error] {e}")

async def upsert_mapping_atomic(
    anilist_id: int,
    provider_id: str,
    provider_slug: str,
    clean_title: str,
    cover_image: str,
) -> None:
    await database.execute(
        """
        SELECT upsert_mapping_atomic(
            :anilist_id, :provider_id, :provider_slug,
            :clean_title, :cover_image
        )
        """,
        values={
            "anilist_id":    anilist_id,
            "provider_id":   provider_id,
            "provider_slug": provider_slug,
            "clean_title":   clean_title,
            "cover_image":   cover_image,
        },
    )
