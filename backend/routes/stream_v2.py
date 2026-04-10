"""
Route: /api/v2/stream  (Resilient Edition)
==========================================
Arsitektur utama — Resilient Mapping Resolution:

  ┌──────────────────────────────────────────────────────────────┐
  │                   MAPPING RESOLUTION LADDER                  │
  │                                                              │
  │  Tier 1 ─ reconciler.reconcile()  (DB + hint)    max 12s    │
  │       │  mappings found? ──YES──► proceed to scrape          │
  │       │  NO / partial                                        │
  │       ▼                                                      │
  │  Tier 2 ─ on-the-fly reconcile with title variants  max 8s  │
  │       │  kebab-slug, cleaned title, native title             │
  │       │  any new mapping found? ──YES──► merge & proceed     │
  │       │  STILL missing providers?                            │
  │       ▼                                                      │
  │  Tier 3 ─ last-resort direct search per provider    max 6s  │
  │           search HTML → extract seriesUrl inline            │
  │           (skips reconciler entirely for that provider)      │
  └──────────────────────────────────────────────────────────────┘
"""
import asyncio
import time
import urllib.parse
import re
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
import httpx

from utils.ssrf_guard import validate_scrape_url, SSRFError
from utils.helpers import extract_domain, determine_quality
from services.config import HEADERS
from services.providers import oploverz_provider, otakudesu_provider, samehadaku_provider, extractor
from services.reconciler import reconciler
from db.connection import database

router = APIRouter()

# ---------------------------------------------------------------------------
# Provider Scrape Helpers
# ---------------------------------------------------------------------------
PROVIDER_TIMEOUT = 10.0
EXTRACTOR_TIMEOUT = 7.0
QUALITY_RANK = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}

async def _resolve_embed(embed: dict, source_tag: str) -> Optional[dict]:
    url = embed.get('url') or embed.get('resolved', '')
    if not url: return None
    try:
        async with asyncio.timeout(EXTRACTOR_TIMEOUT):
            resolved = await extractor.extract_raw_video(url)
        return {
            'provider':  embed.get('provider', source_tag),
            'domain':    extract_domain(resolved),
            'quality':   determine_quality(embed.get('quality', 'Auto')),
            'url':       resolved,
            'embed_url': url,
            'type':      'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe',
            'source':    source_tag,
        }
    except: return None

async def _scrape_oploverz(episode_url: str) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT):
            res = await oploverz_provider.get_episode_sources(episode_url)
        resolved = await asyncio.gather(*[_resolve_embed(e, 'oploverz') for e in res.get('sources', [])])
        return {'sources': [s for s in resolved if s], 'downloads': res.get('downloads', []), 'provider': 'oploverz'}
    except:
        return {'sources': [], 'downloads': [], 'provider': 'oploverz'}

async def _scrape_otakudesu(series_url: str, episode_num: float) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT):
            details = await otakudesu_provider.get_anime_detail(series_url)
        if not details: return {'sources': [], 'provider': 'otakudesu'}
        target_url = next((e['url'] for e in details.get('episodes', []) if re.search(fr'\b{episode_num}\b', e['title'])), None)
        if not target_url: return {'sources': [], 'provider': 'otakudesu'}
        raw = await otakudesu_provider.get_episode_sources(target_url)
        embeds = raw if isinstance(raw, list) else raw.get('sources', [])
        resolved = await asyncio.gather(*[_resolve_embed(e, 'otakudesu') for e in embeds])
        return {'sources': [s for s in resolved if s], 'provider': 'otakudesu'}
    except:
        return {'sources': [], 'provider': 'otakudesu'}

async def _scrape_kuronime(title: str, episode_num: float) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT):
            s = await kuronime_provider.search(title)
            if not s: return {'sources': [], 'provider': 'kuronime'}
            details = await kuronime_provider.get_anime_detail(s[0]['url'])
            if not details: return {'sources': [], 'provider': 'kuronime'}
            target_url = next((e['url'] for e in details.get('episodes', []) if re.search(fr'\b{episode_num}\b', e['title'])), None)
            if not target_url: return {'sources': [], 'provider': 'kuronime'}
            raw = await kuronime_provider.get_episode_sources(target_url)
            embeds = raw if isinstance(raw, list) else raw.get('sources', [])
            resolved = await asyncio.gather(*[_resolve_embed(e, 'kuronime') for e in embeds])
            return {'sources': [s for s in resolved if s], 'provider': 'kuronime'}
    except:
        return {'sources': [], 'provider': 'kuronime'}

# ---------------------------------------------------------------------------
# Tier-3 Last Resort Helpers
# ---------------------------------------------------------------------------
async def _last_resort_otakudesu(title: str, episode_num: float) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(8.0):
            q = urllib.parse.quote_plus(title)
            r = await otakudesu_provider.client.get(f"https://otakudesu.blog/?s={q}&post_type=anime")
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(r.text, 'lxml')
            first = soup.select_one('ul.chivsrc li h2 a')
            if not first: return {'sources': [], 'provider': 'otakudesu', 'tier': 3}
            return await _scrape_otakudesu(first.get('href'), episode_num)
    except: return {'sources': [], 'provider': 'otakudesu', 'tier': 3}

# ---------------------------------------------------------------------------
# Core Logic
# ---------------------------------------------------------------------------
def _title_variants(title: str) -> list[str]:
    variants = [title.strip()]
    cleaned = re.sub(r'\b(sub\s*indo|batch|bd|ova|season\s*\d+)\b', '', title, flags=re.IGNORECASE).strip()
    if cleaned not in variants: variants.append(cleaned)
    return variants[:3]

@router.get('/v2/stream/sources')
async def get_sources_v2(
    title: str = Query(..., description="Anime title"),
    ep: int = Query(..., description="Episode number"),
    anilist_id: int = Query(None, description="Anilist ID")
):
    start_ts = time.monotonic()
    # Tier 1 & 2: Reconciler with Variants
    mappings = {}
    for variant in _title_variants(title):
        try:
            async with asyncio.timeout(10.0):
                recon_result = await reconciler.reconcile(provider_id="samehadaku", provider_slug="", raw_title=variant)
                if recon_result and recon_result.providers:
                    for p in recon_result.providers:
                        mappings[p.provider_id] = p.provider_slug
                    break
        except: continue

    scrape_tasks = []
    providers_attempted = []

    # Focus on all providers that can yield Direct Streams (Wibufile, DesuDrives, 4meplayer)
    
    # 1. Samehadaku (Wibufile, etc)
    if mappings and 'samehadaku' in mappings:
        pass # Currently _scrape_samehadaku handles title search internally, but we can just use the mapping title if needed
    scrape_tasks.append(_scrape_samehadaku(title, ep))
    providers_attempted.append('samehadaku')
    
    # 2. Oploverz (4meplayer, Oplo2, Blogger)
    # Oploverz often uses title-based slugs, so we can try slugifying
    if mappings and 'oploverz' in mappings:
        slug = mappings['oploverz']
    else:
        slug = title.lower().replace(' ', '-')
    scrape_tasks.append(_scrape_oploverz(f"https://o.oploverz.ltd/series/{slug}/episode/{ep}/"))
    providers_attempted.append('oploverz')

    # 3. Otakudesu (DesuDrives, Blogger)
    if mappings and 'otakudesu' in mappings:
        scrape_tasks.append(_scrape_otakudesu(f"https://otakudesu.blog/anime/{mappings['otakudesu']}/", ep))
    else:
        # Fallback to search
        scrape_tasks.append(_last_resort_otakudesu(title, ep))
    providers_attempted.append('otakudesu')
    
    # 4. Kuronime (KuroPlayer, HLS, Kraken)
    scrape_tasks.append(_scrape_kuronime(title, ep))
    providers_attempted.append('kuronime')

    if not scrape_tasks:
        raise HTTPException(status_code=503, detail="All providers down or mapping failed.")

    results = await asyncio.gather(*scrape_tasks, return_exceptions=True)
    
    all_sources = []
    for res in results:
        if isinstance(res, dict) and res.get('sources'):
            all_sources.extend(res['sources'])

    # FILTER: ONLY DIRECT LINKS
    all_sources = [s for s in all_sources if s.get('type') == 'direct']

    all_sources.sort(key=lambda x: QUALITY_RANK.get(x.get('quality', 'Auto'), 1), reverse=True)

    return {
        'success': len(all_sources) > 0,
        'sources': all_sources,
        'elapsed_ms': int((time.monotonic() - start_ts) * 1000)
    }

