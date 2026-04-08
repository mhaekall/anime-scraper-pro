"""
Route: /api/v2/home
===================
Versi 2 dari endpoint home. Perbedaan utama vs v1:
  - Response terstruktur dengan schema yang lebih kaya
  - Mengembalikan 'trending', 'latest_episodes', 'top_rated', 'seasonal'
  - Background refresh tetap menggunakan SWR pattern
  - Fallback ke background_scrape_job jika cache kosong
"""
import asyncio
import time
from fastapi import APIRouter, HTTPException
from services.cache import upstash_get, upstash_set
from services.background import background_scrape_job
from db.connection import database

router = APIRouter()

# ---------------------------------------------------------------------------
# Schema helpers
# ---------------------------------------------------------------------------

def _empty_home_v2() -> dict:
    return {
        "latest_episodes": [],
        "top_rated": [],
        "trending": [],
        "seasonal": [],
        "last_updated": 0,
        "version": "v2",
    }


async def _fetch_top_rated_from_db(limit: int = 12) -> list:
    """Ambil anime top berdasarkan score dari DB."""
    try:
        rows = await database.fetch_all(
            '''
            SELECT DISTINCT ON (meta."anilistId")
                meta."anilistId",
                meta."cleanTitle"   AS title,
                meta."nativeTitle"  AS nativeTitle,
                meta."coverImage"   AS img,
                meta."bannerImage"  AS banner,
                meta."score",
                meta."status",
                meta."totalEpisodes",
                meta."genres",
                m."providerId",
                m."providerSlug"
            FROM anime_metadata meta
            LEFT JOIN anime_mappings m ON meta."anilistId" = m."anilistId"
            WHERE meta.score IS NOT NULL
            ORDER BY meta."anilistId", meta.score DESC NULLS LAST
            LIMIT :limit
            ''',
            values={'limit': limit}
        )
        result = []
        for r in rows:
            item = dict(r)
            # Bangun URL berdasarkan provider
            if item.get('providerSlug') and item.get('providerId') == 'oploverz':
                item['url'] = f"https://o.oploverz.ltd/series/{item['providerSlug']}"
                item['internalUrl'] = f"/anime/{item['providerSlug']}"
            else:
                item['url'] = ""
                item['internalUrl'] = ""
            result.append(item)
        return result
    except Exception as e:
        print(f"[home_v2] DB top_rated error: {e}")
        return []


async def _build_v2_payload(v1_cached: dict) -> dict:
    """
    Gabungkan data v1 cache + data tambahan dari DB untuk membentuk payload v2.
    """
    top_rated = await _fetch_top_rated_from_db(12)
    
    latest = v1_cached.get('latest_episodes', [])
    
    # Trending = ambil dari latest yang punya popularity tinggi
    trending = sorted(
        [i for i in latest if i.get('popularity', 0) > 0],
        key=lambda x: x.get('popularity', 0),
        reverse=True
    )[:10]

    return {
        "latest_episodes": latest[:24],
        "top_rated": top_rated,
        "trending": trending,
        "seasonal": [],          # Placeholder — bisa diisi dari AniList seasonal query
        "last_updated": v1_cached.get('last_updated', int(time.time())),
        "version": "v2",
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get('/v2/home')
async def get_home_v2():
    """
    Endpoint home versi 2.
    
    Flow:
      1. Coba baca dari cache Redis key `home_data` (yang diisi oleh background_scrape_job)
      2. Jika ada → transform ke format v2 (tambah top_rated, trending dari DB)
      3. Jika tidak ada → trigger background job, return 202 dengan pesan
      4. Jika data stale (tapi belum expired) → return data + trigger refresh background
    """
    try:
        cached = await upstash_get("home_data")
        now = int(time.time())

        if cached:
            # Unwrap SWR envelope
            if isinstance(cached, dict) and 'data' in cached:
                raw_data = cached['data']
                stale_at = cached.get('stale_at', 0)
                expires_at = cached.get('expires_at', now + 86400)
            else:
                raw_data = cached
                stale_at = now  # Treat as immediately stale
                expires_at = now + 86400

            # Baca v2 cache khusus jika ada
            v2_cached = await upstash_get("home_data_v2")
            if v2_cached and isinstance(v2_cached, dict) and 'data' in v2_cached:
                v2_stale_at = v2_cached.get('stale_at', 0)
                if now < v2_stale_at:
                    # Cache v2 masih segar
                    return {'success': True, 'data': v2_cached['data']}
            
            # Build v2 dari data v1
            v2_data = await _build_v2_payload(raw_data)
            
            # Simpan v2 cache (TTL lebih pendek: 30 menit)
            asyncio.create_task(upstash_set("home_data_v2", {
                'data': v2_data,
                'stale_at': now + 1800,
                'expires_at': now + 86400,
                'created_at': now
            }, ex=86400))

            # Jika v1 stale, trigger refresh background
            if now >= stale_at:
                asyncio.create_task(background_scrape_job())

            return {'success': True, 'data': v2_data}

        # Cache benar-benar kosong → trigger generation
        asyncio.create_task(background_scrape_job())
        return {
            'success': False,
            'message': 'Data sedang disiapkan. Refresh dalam 60 detik.',
            'data': _empty_home_v2()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/v2/home/force-refresh')
async def force_refresh_home_v2():
    """
    Admin endpoint: paksa refresh cache home.
    Berguna saat deploy atau ada perubahan data.
    """
    try:
        # Hapus v2 cache agar dibuild ulang
        from services.cache import upstash_del
        await upstash_del("home_data_v2")
        asyncio.create_task(background_scrape_job())
        return {'success': True, 'message': 'Refresh dijadwalkan. Data baru tersedia dalam ~60 detik.'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
