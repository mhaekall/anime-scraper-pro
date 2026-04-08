import urllib.parse
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import StreamingResponse
import httpx
import re
from bs4 import BeautifulSoup
from utils.ssrf_guard import validate_scrape_url
from services.config import HEADERS
from db.connection import database

# Need to import providers from services.providers (which I haven't created yet)
# I will create services/providers.py
from services.providers import oploverz_provider, otakudesu_provider, samehadaku_provider, extractor

router = APIRouter()

@router.options('/v1/stream')
async def stream_video_options():
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Range, Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        }
    )

@router.get('/v1/stream')
async def stream_video(url: str, request: Request):
    try:
        validate_scrape_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    range_header = request.headers.get("range")
    headers = {"User-Agent": HEADERS["User-Agent"]}
    if range_header:
        headers["Range"] = range_header

    is_m3u8 = url.split('?')[0].endswith('.m3u8')

    if is_m3u8:
        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            resp = await client.get(url, headers=headers, follow_redirects=True)
            content = resp.text
            
            base_url = "/".join(url.split('/')[:-1])
            
            lines = []
            for line in content.splitlines():
                if line.startswith('#') or not line.strip():
                    lines.append(line)
                else:
                    original_link = line.strip()
                    if not original_link.startswith('http'):
                        original_link = f"{base_url}/{original_link}"
                    
                    proxied_link = f"/api/v1/stream?url={urllib.parse.quote_plus(original_link)}"
                    lines.append(proxied_link)
            
            return Response(
                content="\n".join(lines),
                media_type="application/vnd.apple.mpegurl",
                headers={"Access-Control-Allow-Origin": "*"}
            )

    async def generate():
        async with httpx.AsyncClient(verify=False, timeout=60.0) as stream_client:
            try:
                async with stream_client.stream("GET", url, headers=headers, follow_redirects=True) as resp:
                    async for chunk in resp.aiter_bytes(chunk_size=128 * 1024):
                        yield chunk
            except Exception as e:
                print(f"[Stream Proxy] Error during streaming: {e}")

    async with httpx.AsyncClient(verify=False, timeout=10.0) as head_client:
        try:
            head_resp = await head_client.head(url, headers=headers, follow_redirects=True)
            status_code = head_resp.status_code
            
            response_headers = {
                "Content-Type": head_resp.headers.get("Content-Type", "video/mp4"),
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600" if not range_header else "no-cache"
            }
            
            if "Content-Range" in head_resp.headers:
                response_headers["Content-Range"] = head_resp.headers["Content-Range"]
            if "Content-Length" in head_resp.headers:
                response_headers["Content-Length"] = head_resp.headers["Content-Length"]
                
            return StreamingResponse(generate(), status_code=status_code, headers=response_headers)
        except Exception as e:
            return StreamingResponse(generate(), media_type="video/mp4")

@router.get('/v1/stream/{anime_slug}/{episode_num}')
async def get_best_video_stream(anime_slug: str, episode_num: str, source_url: str = Query(None)):
    clean_slug = anime_slug.replace('-', ' ')
    db_mappings = {}
    try:
        query = """
            SELECT m."providerId", m."providerSlug"
            FROM anime_metadata meta
            JOIN anime_mappings m ON meta."anilistId" = m."anilistId"
            WHERE meta."cleanTitle" ILIKE :slug OR meta."nativeTitle" ILIKE :slug
        """
        mappings = await database.fetch_all(query=query, values={'slug': f'%{clean_slug}%'})
        db_mappings = {m['providerId']: m['providerSlug'] for m in mappings}
    except Exception as e:
        print(f"DB mapping error: {e}")

    async def try_extract(sources, source_name):
        for s in sources:
            url = s.get('url') or s.get('resolved')
            if url:
                raw_link = await extractor.extract_raw_video(url)
                if raw_link and raw_link != url and raw_link.endswith(('.m3u8', '.mp4')):
                    return {"stream_url": raw_link, "provider": source_name, "quality": s.get('quality', 'Auto')}
        return None

    if source_url:
        try:
            if 'oploverz.ltd' in source_url:
                res = await oploverz_provider.get_episode_sources(source_url)
                if res and res.get('sources'):
                    result = await try_extract(res['sources'], 'oploverz')
                    if result: return result
            elif 'otakudesu' in source_url:
                res = await otakudesu_provider.get_episode_sources(source_url)
                if res:
                    result = await try_extract(res, 'otakudesu')
                    if result: return result
            elif 'samehadaku' in source_url:
                res = await samehadaku_provider.get_episode_sources(source_url)
                if res:
                    result = await try_extract(res, 'samehadaku')
                    if result: return result
        except Exception as e:
            print(f"Direct source_url error: {e}")

    # Oploverz Fallback
    try:
        op_slug = db_mappings.get('oploverz', anime_slug)
        episode_url = f"https://o.oploverz.ltd/series/{op_slug}/episode/{episode_num}"
        op_res = await oploverz_provider.get_episode_sources(episode_url)
        if op_res and op_res.get('sources'):
            result = await try_extract(op_res['sources'], 'oploverz')
            if result: return result
    except Exception as e:
        print(f"Oploverz fallback error: {e}")

    # Otakudesu Fallback
    try:
        ot_slug = db_mappings.get('otakudesu', anime_slug)
        search_url = f"https://otakudesu.cloud/?s={urllib.parse.quote_plus(clean_slug)}&post_type=anime"
        r = await otakudesu_provider.client.get(search_url)
        soup = BeautifulSoup(r.text, 'lxml')
        first = soup.select_one('ul.chivsrc li h2 a')
        if first:
            series_url = first.get('href')
            details = await otakudesu_provider.get_anime_detail(series_url)
            target_ep = None
            try:
                target_ep_float = float(episode_num)
            except ValueError:
                target_ep_float = None

            for e in details.get('episodes', []):
                num_match = re.search(r'\b(?:Episode|Eps)\s*(\d+(?:\.\d+)?)\b', e['title'], re.IGNORECASE)
                if num_match and target_ep_float is not None and float(num_match.group(1)) == target_ep_float:
                    target_ep = e['url']
                    break
            if target_ep:
                ot_res = await otakudesu_provider.get_episode_sources(target_ep)
                if ot_res:
                    result = await try_extract(ot_res, 'otakudesu')
                    if result: return result
    except Exception as e:
        print(f"Otakudesu fallback error: {e}")

    # Samehadaku Fallback
    try:
        sh_slug = db_mappings.get('samehadaku', anime_slug)
        search_url = f"https://v2.samehadaku.how/?s={urllib.parse.quote_plus(clean_slug)}"
        r = await samehadaku_provider.client.get(search_url)
        soup = BeautifulSoup(r.text, 'lxml')
        first = soup.select_one('.animepost .animposx a')
        if first:
            series_url = first.get('href')
            details = await samehadaku_provider.get_anime_detail(series_url)
            target_ep = None
            try:
                target_ep_float = float(episode_num)
            except ValueError:
                target_ep_float = None

            for e in details.get('episodes', []):
                num_match = re.search(r'\b(?:Episode|Eps)\s*(\d+(?:\.\d+)?)\b', e['title'], re.IGNORECASE)
                if num_match and target_ep_float is not None and float(num_match.group(1)) == target_ep_float:
                    target_ep = e['url']
                    break
            if target_ep:
                sh_res = await samehadaku_provider.get_episode_sources(target_ep)
                if sh_res:
                    result = await try_extract(sh_res, 'samehadaku')
                    if result: return result
    except Exception as e:
        print(f"Samehadaku fallback error: {e}")

    raise HTTPException(status_code=404, detail="Stream not found")
