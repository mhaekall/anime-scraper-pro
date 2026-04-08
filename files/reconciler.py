"""
Reconciler: Dynamic AniList ID ↔ Provider Mapping Engine
=========================================================
Tugas utama:
  1. Cari mapping (anilistId → providerSlug) dari DB
  2. Jika tidak ada, lakukan fuzzy-search ke semua provider secara paralel
  3. Simpan mapping baru ke DB untuk request berikutnya (write-through cache)

Pattern: "Provider Resolution Chain"
  DB → Cache → Live Search (paralel) → Write-back
"""
import asyncio
import re
import urllib.parse
from typing import Optional, Dict
from bs4 import BeautifulSoup

from db.connection import database
from services.anilist import fetch_anilist_info
from services.db import upsert_anime_db
from services.providers import otakudesu_provider, samehadaku_provider


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    """Lowercase, strip noise, collapse spaces — for fuzzy matching."""
    text = re.sub(r'\b(sub indo|batch|bd|ova|ona|movie|season|part|episode|ep)\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'[^a-z0-9 ]', ' ', text.lower())
    return re.sub(r'\s+', ' ', text).strip()


async def _search_otakudesu(title: str) -> Optional[Dict]:
    """Return {providerSlug, seriesUrl} or None."""
    try:
        q = urllib.parse.quote_plus(title)
        r = await otakudesu_provider.client.get(
            f"https://otakudesu.cloud/?s={q}&post_type=anime",
            timeout=8.0
        )
        soup = BeautifulSoup(r.text, 'lxml')
        first = soup.select_one('ul.chivsrc li h2 a')
        if not first:
            return None
        href = first.get('href', '')
        slug = href.strip('/').split('/')[-1]
        return {'providerId': 'otakudesu', 'providerSlug': slug, 'seriesUrl': href}
    except Exception as e:
        print(f"[Reconciler] otakudesu search error: {e}")
        return None


async def _search_samehadaku(title: str) -> Optional[Dict]:
    """Return {providerSlug, seriesUrl} or None."""
    try:
        q = urllib.parse.quote_plus(title)
        r = await samehadaku_provider.client.get(
            f"https://v2.samehadaku.how/?s={q}",
            timeout=8.0
        )
        soup = BeautifulSoup(r.text, 'lxml')
        first = soup.select_one('.animepost .animposx a')
        if not first:
            return None
        href = first.get('href', '')
        slug = href.strip('/').split('/')[-1]
        return {'providerId': 'samehadaku', 'providerSlug': slug, 'seriesUrl': href}
    except Exception as e:
        print(f"[Reconciler] samehadaku search error: {e}")
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class ProviderReconciler:
    """
    Stateless reconciler — semua state ada di DB/cache.
    Thread-safe karena semua operasi async.
    """

    async def reconcile(
        self,
        title: str,
        anilist_id: Optional[int] = None,
        hint_oploverz_slug: Optional[str] = None,
    ) -> Dict[str, str]:
        """
        Resolve { providerId → providerSlug } untuk sebuah anime.

        Priority:
          1. DB lookup by anilist_id (fastest — sudah pernah di-map)
          2. DB lookup by cleanTitle fuzzy (fallback kalau ID tidak diketahui)
          3. Parallel live search ke semua provider (terakhir, paling lambat)
          4. Write-back hasil ke DB

        Returns:
          dict seperti {'oploverz': 'one-piece', 'otakudesu': 'one-piece-sub-indo', ...}
          Key yang tidak ditemukan tidak ada di dict.
        """
        mappings: Dict[str, str] = {}

        # 1. Oploverz slug sering sudah diketahui dari URL (hint dari frontend)
        if hint_oploverz_slug:
            mappings['oploverz'] = hint_oploverz_slug

        # 2. DB lookup
        try:
            if anilist_id:
                rows = await database.fetch_all(
                    'SELECT "providerId", "providerSlug" FROM anime_mappings WHERE "anilistId" = :id',
                    values={'id': anilist_id}
                )
            else:
                rows = await database.fetch_all(
                    '''SELECT m."providerId", m."providerSlug"
                       FROM anime_metadata meta
                       JOIN anime_mappings m ON meta."anilistId" = m."anilistId"
                       WHERE meta."cleanTitle" ILIKE :t OR meta."nativeTitle" ILIKE :t
                       LIMIT 10''',
                    values={'t': f'%{title}%'}
                )
            for row in rows:
                mappings[row['providerId']] = row['providerSlug']
        except Exception as e:
            print(f"[Reconciler] DB lookup error: {e}")

        # 3. Jika masih ada provider yang belum ada mappingnya → live search paralel
        missing_providers = [p for p in ('otakudesu', 'samehadaku') if p not in mappings]

        if missing_providers:
            search_tasks = {}
            if 'otakudesu' in missing_providers:
                search_tasks['otakudesu'] = _search_otakudesu(title)
            if 'samehadaku' in missing_providers:
                search_tasks['samehadaku'] = _search_samehadaku(title)

            # Jalankan paralel, timeout 10 detik untuk semua gabungan
            results = await asyncio.gather(
                *[asyncio.wait_for(t, timeout=10.0) for t in search_tasks.values()],
                return_exceptions=True
            )

            found_new = []
            for provider_id, result in zip(search_tasks.keys(), results):
                if isinstance(result, dict) and result:
                    mappings[provider_id] = result['providerSlug']
                    found_new.append(result)

            # 4. Write-back ke DB (fire-and-forget)
            if found_new:
                asyncio.create_task(self._writeback(title, found_new))

        return mappings

    async def _writeback(self, title: str, new_mappings: list):
        """Ambil AniList data lalu simpan semua mapping baru ke DB."""
        try:
            anilist_data = await fetch_anilist_info(title)
            if not anilist_data:
                return
            for m in new_mappings:
                await upsert_anime_db(anilist_data, m['providerId'], m['providerSlug'])
        except Exception as e:
            print(f"[Reconciler] writeback error: {e}")

    async def resolve_episode_url(
        self,
        provider_id: str,
        provider_slug: str,
        episode_num: int | float,
    ) -> Optional[str]:
        """
        Bangun URL episode dari slug + nomor episode, sesuai pola masing-masing provider.
        """
        try:
            ep = int(episode_num) if float(episode_num).is_integer() else episode_num

            if provider_id == 'oploverz':
                return f"https://o.oploverz.ltd/series/{provider_slug}/episode/{ep}/"
            
            if provider_id == 'otakudesu':
                details = await otakudesu_provider.get_anime_detail(
                    f"https://otakudesu.cloud/anime/{provider_slug}/"
                )
                for e in details.get('episodes', []):
                    m = re.search(r'(\d+(?:\.\d+)?)', e['title'])
                    if m and float(m.group(1)) == float(episode_num):
                        return e['url']
            
            if provider_id == 'samehadaku':
                details = await samehadaku_provider.get_anime_detail(
                    f"https://v2.samehadaku.how/anime/{provider_slug}/"
                )
                for e in details.get('episodes', []):
                    m = re.search(r'(\d+(?:\.\d+)?)', e['title'])
                    if m and float(m.group(1)) == float(episode_num):
                        return e['url']
        except Exception as e:
            print(f"[Reconciler] resolve_episode_url error ({provider_id}): {e}")
        return None


# Singleton
reconciler = ProviderReconciler()
