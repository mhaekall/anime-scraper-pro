import urllib.parse
import re
import asyncio
import os
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query, Header, Depends

from services.config import BASE_URL
from services.clients import scraping_client
from services.cache import swr_cache_get
from services.anilist import fetch_anilist_info
from services.reconciler import reconciler
from services.db import upsert_anime_db
from utils.ssrf_guard import validate_scrape_url, SSRFError
from utils.helpers import extract_domain, determine_quality
from services.providers import oploverz_provider, otakudesu_provider, samehadaku_provider, extractor
from db.connection import database

router = APIRouter()

@router.get('/series')
async def get_series():
    async def fetch_series():
        url = 'https://o.oploverz.ltd/series'
        r = await scraping_client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        series = []
        seen = set()

        for a in soup.select('a[href^="/series/"]'):
            href = a.get('href')
            if href and len(href) > 8 and href not in seen:
                parts = href.strip('/').split('/')
                if len(parts) >= 2 and parts[0] == 'series':
                    slug = parts[1]
                    title = slug.replace('-', ' ').title()
                    seen.add(href)
                    full_url = href if href.startswith('http') else BASE_URL + href
                    series.append({
                        'title': title,
                        'url': full_url,
                        'img': None,
                        'banner': None,
                        'score': None
                    })
        return series
    
    try:
        data = await swr_cache_get("series_list", fetch_series, ttl=3600, swr=86400)
        return {'success': True, 'data': data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/series-detail')
async def get_series_detail(url: str = Query(..., description="Target URL of the series")):
    parts = url.strip('/').split('/')
    slug_title = parts[-1].replace('-', ' ').title() if len(parts) > 0 else "Unknown"
    cache_key = f"series_detail:{slug_title}"

    async def fetch_details():
        r = await scraping_client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        
        poster_meta = soup.find('meta', property="og:image")
        poster = poster_meta.get('content') if poster_meta else None
        
        desc_meta = soup.find('meta', property="og:description")
        desc = desc_meta.get('content') if desc_meta else ""
        
        episodes = []
        seen = set()
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            matches = re.findall(r'episodeNumber:"([^"]+)"', payload)
            for ep_num in matches:
                if ep_num not in seen:
                    seen.add(ep_num)
                    full_url = f"{url.rstrip('/')}/episode/{ep_num}"
                    try:
                        parsed_num = float(ep_num)
                    except ValueError:
                        parsed_num = 0.0
                    episodes.append({
                        'title': f'Episode {ep_num}', 
                        'url': full_url,
                        'number': parsed_num
                    })
            episodes.sort(key=lambda x: x['number'], reverse=True)
                
        provider_slug = url.strip('/').split('/')[-1]
        recon_res = await reconciler.reconcile("oploverz", provider_slug, slug_title)
        
        anilist_data = recon_res.anilist_metadata if recon_res else None
        if anilist_data:
            anilist_data["anilistId"] = recon_res.canonical_anilist_id
            anilist_data["cleanTitle"] = recon_res.canonical_title
            asyncio.create_task(upsert_anime_db(anilist_data, "oploverz", provider_slug))

        fallback_desc = "Tidak ada sinopsis resmi yang tersedia untuk seri anime ini."
        if desc and "Oploverz" not in desc and "Plover" not in desc:
            fallback_desc = desc
            
        return {
            'anilistId': anilist_data['anilistId'] if anilist_data else None,
            'title': slug_title,
            'cleanTitle': anilist_data['cleanTitle'] if anilist_data else None,
            'nativeTitle': anilist_data['nativeTitle'] if anilist_data else None,
            'poster': anilist_data['hdImage'] if anilist_data else poster,
            'color': anilist_data['color'] if anilist_data else None,
            'banner': anilist_data['banner'] if anilist_data else None,
            'synopsis': anilist_data['description'] if anilist_data and anilist_data['description'] else fallback_desc,
            'score': anilist_data['score'] if anilist_data else None,
            'genres': anilist_data['genres'] if anilist_data else [],
            'status': anilist_data['status'] if anilist_data else None,
            'totalEpisodes': anilist_data['episodes'] if anilist_data else None,
            'season': anilist_data['season'] if anilist_data else None,
            'seasonYear': anilist_data['seasonYear'] if anilist_data else None,
            'studios': anilist_data['studios'] if anilist_data else [],
            'recommendations': anilist_data['recommendations'] if anilist_data else [],
            'nextAiringEpisode': anilist_data['nextAiringEpisode'] if anilist_data else None,
            'episodes': episodes
        }

    try:
        data = await swr_cache_get(cache_key, fetch_details, ttl=3600, swr=86400)
        return {'success': True, 'data': data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/episodes')
async def get_episodes(url: str = Query(..., description="Target URL of the series")):
    try:
        r = await scraping_client.get(url)
        if r.status_code in (301, 302, 303, 307, 308):
            next_url = r.headers.get('location')
            if next_url:
                if not next_url.startswith('http'):
                    next_url = urllib.parse.urljoin(url, next_url)
                validate_scrape_url(next_url)
                r = await scraping_client.get(next_url)
        
        episodes = []
        seen = set()
        
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            matches = re.findall(r'episodeNumber:"([^"]+)"', payload)
            for ep_num in matches:
                if ep_num not in seen:
                    seen.add(ep_num)
                    full_url = f"{url.rstrip('/')}/episode/{ep_num}"
                    try:
                        parsed_num = float(ep_num)
                    except ValueError:
                        parsed_num = 0.0
                    episodes.append({
                        'title': f'Episode {ep_num}', 
                        'url': full_url,
                        'number': parsed_num
                    })
            episodes.sort(key=lambda x: x['number'], reverse=True)
        
        return {'success': True, 'data': episodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/scrape')
async def scrape_episode(url: str = Query(..., description="Episode URL to scrape")):
    try:
        validate_scrape_url(url)
    except SSRFError as e:
        raise HTTPException(status_code=400, detail=f"URL tidak valid: {str(e)}")

    try:
        r = await scraping_client.get(url)
        if r.status_code in (301, 302, 303, 307, 308):
            next_url = r.headers.get('location')
            if next_url:
                if not next_url.startswith('http'):
                    next_url = urllib.parse.urljoin(url, next_url)
                validate_scrape_url(next_url)
                r = await scraping_client.get(next_url)
        html = r.text
        soup = BeautifulSoup(html, 'lxml')
        
        raw_embeds = []
        seen = set()

        title_tag = soup.find('title')
        raw_title = title_tag.text if title_tag else 'Unknown Title'
        anime_title = raw_title.split('Episode')[0].replace('Nonton', '').replace(' | Oploverz', '').strip()
        
        anilist_data = await fetch_anilist_info(anime_title)
        poster = anilist_data['hdImage'] if anilist_data else ""

        downloads = []
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', html, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            
            ep_match = re.search(r'episode:\{(.*?)streamUrl:(\[.*?\])', payload, re.DOTALL)
            if ep_match:
                streams_str = ep_match.group(2)
                stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', streams_str)
                
                down_match = re.search(r'downloadUrl:\s*(\[.*?\]),streamUrl:', payload, re.DOTALL)
                if down_match:
                    down_str = down_match.group(1)
                    fmt_blocks = re.finditer(r'format:\"([^\"]+)\",resolutions:\[(.*?)\]\}\]', down_str, re.DOTALL)
                    for fmt in fmt_blocks:
                        f_type = fmt.group(1)
                        res_str = fmt.group(2)
                        quals = re.finditer(r'quality:\"([^\"]+)\",download_links:\[(.*?)\]\}', res_str, re.DOTALL)
                        for q in quals:
                            q_type = q.group(1)
                            links_str = q.group(2)
                            links = []
                            for link in re.finditer(r'host:\"([^\"]+)\",url:\"([^\"]+)\"', links_str):
                                links.append({'host': link.group(1), 'url': link.group(2)})
                            downloads.append({'format': f_type, 'quality': q_type, 'links': links})
            else:
                stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', payload)
        else:
            stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', html)
        
        bad_keywords = ['youtube', 'facebook', 'twitter', 'instagram', 't.me', 'ads', 'banner', 'histats', 'google', 'wp-admin', 'cutt.ly', 't2m.io', 'vtxlinks', 'ombak', 'togel', 'slot', 'gcbos', 'guguk', 'joiboy', 'tapme', 'infodomain', 'tempatsucii']

        for source_name, source_url in stream_matches:
            if any(kw in source_url.lower() for kw in bad_keywords): continue
            domain = extract_domain(source_url)
            quality = determine_quality(source_name + " " + source_url)
            
            dup_key = f"{domain}-{quality}"
            if source_url not in seen and dup_key not in seen:
                seen.add(source_url)
                seen.add(dup_key)
                raw_embeds.append({
                    'provider': source_name,
                    'domain': domain,
                    'quality': quality,
                    'url': source_url
                })

        async def process_embed(embed):
            resolved_url = await extractor.extract_raw_video(embed['url'])
            return {
                'provider': embed['provider'],
                'domain': embed['domain'],
                'quality': embed['quality'],
                'resolved': resolved_url,
                'type': 'direct' if resolved_url.endswith(('.m3u8', '.mp4')) or 'play_url' in html else 'iframe'
            }

        embeds = await asyncio.gather(*(process_embed(e) for e in raw_embeds))

        rank = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}
        embeds.sort(key=lambda x: rank.get(x['quality'], 1), reverse=True)

        return {
            'success': True, 
            'sources': embeds,
            'downloads': downloads,
            'anime': {
                'title': anime_title,
                'poster': poster
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/multi-source')
async def get_multi_source(title: str = Query(..., description="Anime clean title"), ep: int = Query(..., description="Episode number"), oploverz_url: str = Query(None, description="Oploverz exact episode URL")):
    cache_key = f"multi_source:{title}:{ep}:{oploverz_url}"
    
    async def fetch_sources():
        tasks = []
        
        query = """
            SELECT m."providerId", m."providerSlug"
            FROM anime_metadata meta
            JOIN anime_mappings m ON meta."anilistId" = m."anilistId"
            WHERE meta."cleanTitle" ILIKE :title OR meta."nativeTitle" ILIKE :title
        """
        try:
            mappings = await database.fetch_all(query=query, values={'title': f'%{title}%'})
            db_mappings = {m['providerId']: m['providerSlug'] for m in mappings}
        except:
            db_mappings = {}
        
        if oploverz_url:
            tasks.append(oploverz_provider.get_episode_sources(oploverz_url))
        elif 'oploverz' in db_mappings:
            episode_url = f"https://o.oploverz.ltd/series/{db_mappings['oploverz']}/episode/{ep}/"
            tasks.append(oploverz_provider.get_episode_sources(episode_url))
        
        async def fetch_otakudesu():
            try:
                series_url = None
                if 'otakudesu' in db_mappings:
                    series_url = f"https://otakudesu.cloud/anime/{db_mappings['otakudesu']}/"
                else:
                    search_url = f"https://otakudesu.cloud/?s={urllib.parse.quote_plus(title)}&post_type=anime"
                    r = await otakudesu_provider.client.get(search_url)
                    soup = BeautifulSoup(r.text, 'lxml')
                    first_result = soup.select_one('ul.chivsrc li h2 a')
                    if not first_result:
                        return {'sources': []}
                    series_url = first_result.get('href')
                    
                    provider_slug = series_url.strip('/').split('/')[-1]
                    recon_res = await reconciler.reconcile("otakudesu", provider_slug, title)
                    anilist_data = recon_res.anilist_metadata if recon_res else None
                    if anilist_data:
                        anilist_data["anilistId"] = recon_res.canonical_anilist_id
                        anilist_data["cleanTitle"] = recon_res.canonical_title
                        asyncio.create_task(upsert_anime_db(anilist_data, "otakudesu", provider_slug))
                
                if not series_url: return {'sources': []}

                details = await otakudesu_provider.get_anime_detail(series_url)
                target_ep_url = None
                for e in details.get('episodes', []):
                    num_match = re.search(r'\b(?:Episode|Eps)\s*(\d+(?:\.\d+)?)\b', e['title'], re.IGNORECASE)
                    if num_match:
                        try:
                            if float(num_match.group(1)) == float(ep):
                                target_ep_url = e['url']
                                break
                        except:
                            pass
                
                if target_ep_url:
                    sources = await otakudesu_provider.get_episode_sources(target_ep_url)
                    return {'sources': sources}
            except Exception as e:
                print(f"[Otakudesu Aggregator] Error: {e}")
            return {'sources': []}
            
        tasks.append(fetch_otakudesu())
        results = await asyncio.gather(*tasks)
        
        all_sources = []
        downloads = []
        
        if len(results) > 0 and (oploverz_url or 'oploverz' in db_mappings):
            op_res = results[0]
            raw_embeds = op_res.get('sources', [])
            downloads = op_res.get('downloads', [])
            
            async def process_embed(embed):
                resolved_url = await extractor.extract_raw_video(embed['url'])
                return {
                    'provider': embed['provider'],
                    'domain': embed['domain'],
                    'quality': embed['quality'],
                    'resolved': resolved_url,
                    'type': 'direct' if resolved_url.endswith(('.m3u8', '.mp4')) else 'iframe',
                    'source': 'oploverz'
                }
            op_resolved = await asyncio.gather(*(process_embed(e) for e in raw_embeds))
            all_sources.extend(op_resolved)
        
        ot_idx = 1 if (oploverz_url or 'oploverz' in db_mappings) else 0
        if len(results) > ot_idx:
            ot_res = results[ot_idx]
            ot_raw_embeds = ot_res.get('sources', [])
            
            async def process_otakudesu(embed):
                resolved_url = await extractor.extract_raw_video(embed['resolved'])
                return {
                    'provider': embed['provider'],
                    'domain': extract_domain(embed['resolved']),
                    'quality': embed['quality'],
                    'resolved': resolved_url,
                    'type': 'direct' if resolved_url.endswith(('.m3u8', '.mp4')) else 'iframe',
                    'source': 'otakudesu'
                }
            ot_resolved = await asyncio.gather(*(process_otakudesu(e) for e in ot_raw_embeds))
            all_sources.extend(ot_resolved)
            
        rank = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}
        all_sources.sort(key=lambda x: rank.get(x['quality'], 1), reverse=True)

        return {
            'sources': all_sources,
            'downloads': downloads
        }

    try:
        data = await swr_cache_get(cache_key, fetch_sources, ttl=1800, swr=86400)
        return {'success': True, **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/admin/bulk-scrape')
async def bulk_scrape(provider: str = Query('otakudesu', description="otakudesu or samehadaku")):
    async def run_scrape(prov_name):
        if prov_name == 'otakudesu':
            items = await otakudesu_provider.get_ongoing()
        elif prov_name == 'samehadaku':
            items = await samehadaku_provider.get_anime_list()
        else:
            return

        for item in items:
            try:
                title = item['title']
                prov_slug = item['url'].strip('/').split('/')[-1]
                recon_res = await reconciler.reconcile(prov_name, prov_slug, title)
                anilist_data = recon_res.anilist_metadata if recon_res else None
                if anilist_data:
                    anilist_data["anilistId"] = recon_res.canonical_anilist_id
                    anilist_data["cleanTitle"] = recon_res.canonical_title
                    await upsert_anime_db(anilist_data, prov_name, prov_slug)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Bulk scrape error for {title}: {e}")

    asyncio.create_task(run_scrape(provider))
    return {"message": f"Bulk scrape started for {provider}"}
le"] = recon_res.canonical_title
                    await upsert_anime_db(anilist_data, prov_name, prov_slug)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Bulk scrape error for {title}: {e}")

    asyncio.create_task(run_scrape(provider))
    return {"message": f"Bulk scrape started for {provider}"}
