"""
Route: /api/v2/stream
=====================
Versi 2 dari endpoint stream. Arsitektur utama:

  ┌─────────────────────────────────────────────────────────┐
  │              PARALLEL SCRAPING WITH TIMEOUT             │
  │                                                         │
  │  Frontend Request                                       │
  │       │                                                 │
  │       ▼                                                 │
  │  reconciler.reconcile()  ──► DB / Live Search           │
  │       │                        (max 10s)                │
  │       ▼                                                 │
  │  ┌────────────────────────────────┐                     │
  │  │  Parallel Provider Scrape      │                     │
  │  │  ┌──────────┐ ┌──────────────┐│                     │
  │  │  │ Oploverz │ │  Otakudesu  ││  Each with           │
  │  │  │  (8s)    │ │   (8s)      ││  individual timeout  │
  │  │  └──────────┘ └──────────────┘│                     │
  │  │  ┌──────────┐                 │                     │
  │  │  │Samehadaku│                 │                     │
  │  │  │  (8s)    │                 │                     │
  │  │  └──────────┘                 │                     │
  │  └────────────────────────────────┘                     │
  │       │                                                 │
  │       ▼  First valid result wins (race)                 │
  │  Return merged + ranked sources                         │
  └─────────────────────────────────────────────────────────┘

Circuit breaker: Jika provider gagal 3x berturut-turut dalam 5 menit,
provider tersebut di-skip hingga cooldown selesai.
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
# Circuit Breaker — sederhana, in-memory per instance
# ---------------------------------------------------------------------------

_circuit: Dict[str, Dict] = {
    'oploverz':   {'failures': 0, 'open_until': 0},
    'otakudesu':  {'failures': 0, 'open_until': 0},
    'samehadaku': {'failures': 0, 'open_until': 0},
}
_CB_THRESHOLD = 3       # Berapa failure sebelum open
_CB_COOLDOWN  = 300     # Detik sebelum retry (5 menit)


def _is_circuit_open(provider: str) -> bool:
    cb = _circuit.get(provider, {})
    if cb.get('open_until', 0) > time.time():
        return True
    return False


def _record_failure(provider: str):
    cb = _circuit.setdefault(provider, {'failures': 0, 'open_until': 0})
    cb['failures'] += 1
    if cb['failures'] >= _CB_THRESHOLD:
        cb['open_until'] = time.time() + _CB_COOLDOWN
        print(f"[CircuitBreaker] {provider} OPEN — cooldown {_CB_COOLDOWN}s")


def _record_success(provider: str):
    _circuit[provider] = {'failures': 0, 'open_until': 0}


# ---------------------------------------------------------------------------
# Per-provider scrape helpers (dengan timeout individual)
# ---------------------------------------------------------------------------

PROVIDER_TIMEOUT = 8.0   # Detik max per provider
EXTRACTOR_TIMEOUT = 6.0  # Detik max per embed resolution

QUALITY_RANK = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}


async def _resolve_embed(embed: dict, source_tag: str) -> Optional[dict]:
    """Resolve satu embed URL ke raw video link."""
    url = embed.get('url') or embed.get('resolved', '')
    if not url:
        return None
    try:
        async with asyncio.timeout(EXTRACTOR_TIMEOUT):
            resolved = await extractor.extract_raw_video(url)
        return {
            'provider':  embed.get('provider', source_tag),
            'domain':    extract_domain(resolved),
            'quality':   embed.get('quality', 'Auto'),
            'resolved':  resolved,
            'type':      'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe',
            'source':    source_tag,
        }
    except Exception as e:
        print(f"[stream_v2] resolve embed error ({source_tag}): {e}")
        return None


async def _scrape_oploverz(episode_url: str) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT):
            res = await oploverz_provider.get_episode_sources(episode_url)
        _record_success('oploverz')
        raw_embeds = res.get('sources', [])
        downloads  = res.get('downloads', [])

        # Resolve semua embed paralel
        resolved = await asyncio.gather(*[_resolve_embed(e, 'oploverz') for e in raw_embeds])
        sources = [s for s in resolved if s]
        return {'sources': sources, 'downloads': downloads, 'provider': 'oploverz'}
    except Exception as e:
        _record_failure('oploverz')
        print(f"[stream_v2] oploverz scrape error: {e}")
        return {'sources': [], 'downloads': [], 'provider': 'oploverz'}


async def _scrape_otakudesu(series_url: str, episode_num: float) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT):
            details = await otakudesu_provider.get_anime_detail(series_url)

        target_url = None
        for e in details.get('episodes', []):
            m = re.search(r'(\d+(?:\.\d+)?)', e['title'])
            if m and float(m.group(1)) == episode_num:
                target_url = e['url']
                break

        if not target_url:
            return {'sources': [], 'downloads': [], 'provider': 'otakudesu'}

        async with asyncio.timeout(PROVIDER_TIMEOUT):
            raw = await otakudesu_provider.get_episode_sources(target_url)

        _record_success('otakudesu')
        embeds = raw if isinstance(raw, list) else raw.get('sources', [])

        resolved = await asyncio.gather(*[_resolve_embed(e, 'otakudesu') for e in embeds])
        sources = [s for s in resolved if s]
        return {'sources': sources, 'downloads': [], 'provider': 'otakudesu'}
    except Exception as e:
        _record_failure('otakudesu')
        print(f"[stream_v2] otakudesu scrape error: {e}")
        return {'sources': [], 'downloads': [], 'provider': 'otakudesu'}


async def _scrape_samehadaku(series_url: str, episode_num: float) -> Dict[str, Any]:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT):
            details = await samehadaku_provider.get_anime_detail(series_url)

        target_url = None
        for e in details.get('episodes', []):
            m = re.search(r'(\d+(?:\.\d+)?)', e['title'])
            if m and float(m.group(1)) == episode_num:
                target_url = e['url']
                break

        if not target_url:
            return {'sources': [], 'downloads': [], 'provider': 'samehadaku'}

        async with asyncio.timeout(PROVIDER_TIMEOUT):
            raw = await samehadaku_provider.get_episode_sources(target_url)

        _record_success('samehadaku')
        embeds = raw if isinstance(raw, list) else raw.get('sources', [])

        resolved = await asyncio.gather(*[_resolve_embed(e, 'samehadaku') for e in embeds])
        sources = [s for s in resolved if s]
        return {'sources': sources, 'downloads': [], 'provider': 'samehadaku'}
    except Exception as e:
        _record_failure('samehadaku')
        print(f"[stream_v2] samehadaku scrape error: {e}")
        return {'sources': [], 'downloads': [], 'provider': 'samehadaku'}


# ---------------------------------------------------------------------------
# Main multi-source aggregator
# ---------------------------------------------------------------------------

@router.get('/v2/stream/sources')
async def get_sources_v2(
    title:        str   = Query(...,  description="Anime title (slug atau clean title)"),
    ep:           int   = Query(...,  description="Episode number"),
    oploverz_url: str   = Query(None, description="Direct oploverz episode URL (opsional, mempercepat)"),
    anilist_id:   int   = Query(None, description="AniList ID (opsional, mempercepat lookup)"),
):
    """
    Agregasi sumber video dari semua provider secara paralel.

    Returns:
      {
        success: bool,
        sources: [...],       # Semua sumber, sorted by quality
        downloads: [...],     # Link download (dari Oploverz)
        providers_used: [...],
        providers_failed: [...],
        circuit_status: {...}
      }
    """
    # ── 1. Reconcile provider mappings ────────────────────────────────────
    hint_slug = None
    if oploverz_url:
        # Extract slug dari URL: https://o.oploverz.ltd/series/SLUG/episode/N
        parts = oploverz_url.rstrip('/').split('/')
        if 'series' in parts:
            idx = parts.index('series')
            if idx + 1 < len(parts):
                hint_slug = parts[idx + 1]

    try:
        async with asyncio.timeout(12.0):
            mappings = await reconciler.reconcile(
                title=title,
                anilist_id=anilist_id,
                hint_oploverz_slug=hint_slug,
            )
    except asyncio.TimeoutError:
        mappings = {}
        if hint_slug:
            mappings['oploverz'] = hint_slug
        print(f"[stream_v2] reconciler timeout untuk '{title}'")

    # ── 2. Bangun scrape tasks (skip provider yang circuit-open) ──────────
    scrape_tasks = []
    providers_attempted = []
    providers_skipped   = []

    # Oploverz
    if not _is_circuit_open('oploverz'):
        ep_url = oploverz_url
        if not ep_url and 'oploverz' in mappings:
            ep_url = f"https://o.oploverz.ltd/series/{mappings['oploverz']}/episode/{ep}/"
        if ep_url:
            scrape_tasks.append(_scrape_oploverz(ep_url))
            providers_attempted.append('oploverz')
    else:
        providers_skipped.append('oploverz')

    # Otakudesu
    if not _is_circuit_open('otakudesu') and 'otakudesu' in mappings:
        series_url = f"https://otakudesu.cloud/anime/{mappings['otakudesu']}/"
        scrape_tasks.append(_scrape_otakudesu(series_url, float(ep)))
        providers_attempted.append('otakudesu')
    elif 'otakudesu' not in mappings:
        pass  # Mapping tidak ditemukan, skip
    else:
        providers_skipped.append('otakudesu')

    # Samehadaku
    if not _is_circuit_open('samehadaku') and 'samehadaku' in mappings:
        series_url = f"https://v2.samehadaku.how/anime/{mappings['samehadaku']}/"
        scrape_tasks.append(_scrape_samehadaku(series_url, float(ep)))
        providers_attempted.append('samehadaku')
    elif 'samehadaku' not in mappings:
        pass
    else:
        providers_skipped.append('samehadaku')

    if not scrape_tasks:
        raise HTTPException(
            status_code=503,
            detail=f"Semua provider tidak tersedia. Skipped: {providers_skipped}"
        )

    # ── 3. Jalankan semua paralel, total max 15 detik ─────────────────────
    try:
        async with asyncio.timeout(15.0):
            results = await asyncio.gather(*scrape_tasks, return_exceptions=True)
    except asyncio.TimeoutError:
        results = []
        print(f"[stream_v2] global timeout untuk '{title}' ep {ep}")

    # ── 4. Gabungkan + deduplikasi + sort ─────────────────────────────────
    all_sources: List[dict] = []
    all_downloads: List[dict] = []
    providers_failed = []
    providers_used   = []

    seen_domains_quality = set()

    for provider_name, result in zip(providers_attempted, results):
        if isinstance(result, Exception):
            providers_failed.append(provider_name)
            continue
        if not isinstance(result, dict):
            providers_failed.append(provider_name)
            continue

        srcs = result.get('sources', [])
        if srcs:
            providers_used.append(provider_name)
        else:
            providers_failed.append(provider_name)

        for s in srcs:
            dedup_key = f"{s.get('domain', '')}-{s.get('quality', 'Auto')}-{s.get('source', '')}"
            if dedup_key not in seen_domains_quality:
                seen_domains_quality.add(dedup_key)
                all_sources.append(s)

        if provider_name == 'oploverz':
            all_downloads.extend(result.get('downloads', []))

    # Sort by quality
    all_sources.sort(key=lambda x: QUALITY_RANK.get(x.get('quality', 'Auto'), 1), reverse=True)

    return {
        'success':          len(all_sources) > 0,
        'sources':          all_sources,
        'downloads':        all_downloads,
        'providers_used':   providers_used,
        'providers_failed': providers_failed,
        'providers_skipped': providers_skipped,
        'mappings_found':   list(mappings.keys()),
        'circuit_status':   {p: 'OPEN' if _is_circuit_open(p) else 'CLOSED' for p in _circuit},
    }


# ---------------------------------------------------------------------------
# Stream Proxy (HLS + MP4) — sama dengan v1, tidak berubah
# ---------------------------------------------------------------------------

@router.get('/v2/stream/proxy')
async def stream_proxy_v2(url: str, request: Request):
    """
    Proxy video stream. Mendukung HLS (.m3u8) dan MP4.
    Segment .ts dalam m3u8 di-rewrite agar ikut melewati proxy ini.
    """
    try:
        validate_scrape_url(url)
    except SSRFError as e:
        raise HTTPException(status_code=400, detail=str(e))

    range_header = request.headers.get("range")
    req_headers = {"User-Agent": HEADERS["User-Agent"]}
    if range_header:
        req_headers["Range"] = range_header

    if url.split('?')[0].endswith('.m3u8'):
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.get(url, headers=req_headers, follow_redirects=True)
            base_url = "/".join(url.split('/')[:-1])

            lines = []
            for line in resp.text.splitlines():
                if line.startswith('#') or not line.strip():
                    lines.append(line)
                else:
                    seg = line.strip()
                    if not seg.startswith('http'):
                        seg = f"{base_url}/{seg}"
                    lines.append(f"/api/v2/stream/proxy?url={urllib.parse.quote_plus(seg)}")

            return Response(
                content="\n".join(lines),
                media_type="application/vnd.apple.mpegurl",
                headers={"Access-Control-Allow-Origin": "*"},
            )

    async def _stream_chunks():
        async with httpx.AsyncClient(verify=False, timeout=60.0) as sc:
            try:
                async with sc.stream("GET", url, headers=req_headers, follow_redirects=True) as resp:
                    async for chunk in resp.aiter_bytes(chunk_size=128 * 1024):
                        yield chunk
            except Exception as e:
                print(f"[stream_v2 proxy] streaming error: {e}")

    async with httpx.AsyncClient(verify=False, timeout=10.0) as hc:
        try:
            head = await hc.head(url, headers=req_headers, follow_redirects=True)
            resp_headers = {
                "Content-Type":              head.headers.get("Content-Type", "video/mp4"),
                "Accept-Ranges":             "bytes",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control":             "no-cache" if range_header else "public, max-age=3600",
            }
            if "Content-Range" in head.headers:
                resp_headers["Content-Range"] = head.headers["Content-Range"]
            if "Content-Length" in head.headers:
                resp_headers["Content-Length"] = head.headers["Content-Length"]

            return StreamingResponse(_stream_chunks(), status_code=head.status_code, headers=resp_headers)
        except Exception:
            return StreamingResponse(_stream_chunks(), media_type="video/mp4")


# ---------------------------------------------------------------------------
# Health / circuit breaker status
# ---------------------------------------------------------------------------

@router.get('/v2/stream/health')
async def stream_health():
    """Cek status circuit breaker semua provider."""
    return {
        'providers': {
            p: {
                'status':    'OPEN' if _is_circuit_open(p) else 'CLOSED',
                'failures':  _circuit[p]['failures'],
                'open_until': _circuit[p]['open_until'],
                'retry_in':   max(0, int(_circuit[p]['open_until'] - time.time())) if _is_circuit_open(p) else 0,
            }
            for p in _circuit
        }
    }


@router.post('/v2/stream/circuit/reset')
async def reset_circuit(provider: str = Query(...)):
    """Admin: reset circuit breaker satu provider."""
    if provider not in _circuit:
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' tidak dikenal")
    _circuit[provider] = {'failures': 0, 'open_until': 0}
    return {'success': True, 'message': f"Circuit breaker '{provider}' di-reset"}
