import re
import urllib.parse
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from bs4 import BeautifulSoup

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(background_scrape_job())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(title="Anime Scraper API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = 'https://o.oploverz.ltd'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1'
}


# Async HTTP Client with proper TLS config for internal/trusted APIs
client = httpx.AsyncClient(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)

from utils.ssrf_guard import validate_scrape_url, SSRFSafeTransport, SSRFError
scraping_client = httpx.AsyncClient(
    verify=False,
    headers=HEADERS,
    timeout=30.0,
    follow_redirects=False,
    transport=SSRFSafeTransport(),
)

from utils.distributed_lock import DistributedLock

from providers.oploverz import OploverzProvider
from providers.otakudesu import OtakudesuProvider
from providers.doronime import DoronimeProvider

oploverz_provider = OploverzProvider()
otakudesu_provider = OtakudesuProvider()
doronime_provider = DoronimeProvider()



import os
import json

UPSTASH_REDIS_REST_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "https://close-sunfish-80475.upstash.io")
UPSTASH_REDIS_REST_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "gQAAAAAAATpbAAIncDI3MDZlZTliZDk0ODg0ZTZiOGNkNTIzZDZiZGZjNjJhYXAyODA0NzU")

async def upstash_get(key: str):
    try:
        res = await client.get(f"{UPSTASH_REDIS_REST_URL}/get/{key}", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"})
        data = res.json()
        if data.get('result'):
            return json.loads(data['result'])
    except Exception as e:
        print(f"[Upstash] Get error: {e}")
    return None

async def upstash_set(key: str, value: dict, ex: int = 3600):
    try:
        payload = json.dumps(value)
        res = await client.post(f"{UPSTASH_REDIS_REST_URL}/set/{key}?EX={ex}", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}, data=payload)
        return res.json().get('result') == 'OK'
    except Exception as e:
        print(f"[Upstash] Set error: {e}")
    return False

async def background_scrape_job():
    consecutive_failures = 0
    while True:
        lock = DistributedLock(
            upstash_get_fn=upstash_get,
            upstash_set_fn=upstash_set,
            upstash_del_fn=lambda k: client.post(f"{UPSTASH_REDIS_REST_URL}/del/{k}", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}),
            key="background_scrape"
        )
        try:
            async with lock:
                print("[Cron] Starting Aggregator Scrape Job...")
                # Fetch from providers
                # We'll fetch from Oploverz as the primary discovery source for now
                url1 = 'https://o.oploverz.ltd/'
                url2 = 'https://o.oploverz.ltd/page/2/'
                
                r1, r2 = await asyncio.gather(
                    scraping_client.get(url1),
                    scraping_client.get(url2)
                )

                items = []
                seen_titles = set()
                combined_html = r1.text + r2.text
                soup = BeautifulSoup(combined_html, 'lxml')

                for a in soup.select('a[href*="/episode/"]'):
                    img_tag = a.find('img')
                    img = img_tag.get('src') if img_tag else None
                    raw_title = img_tag.get('alt') or a.get('title') if img_tag else None
                    
                    if raw_title and raw_title not in seen_titles:
                        # Clean title for AniList
                        clean_title = raw_title.split('Episode')[0].replace('Nonton', '').replace(' | Oploverz', '').strip()
                        if not clean_title: continue
                        
                        seen_titles.add(raw_title)
                        items.append({
                            'title': clean_title,
                            'url': a.get('href') if a.get('href').startswith('http') else BASE_URL + a.get('href'),
                            'raw_img': img
                        })

                async def process_and_validate(item):
                    try:
                        # 1. VIDEO SOURCE CHECK (Peeking)
                        # We perform a quick fetch to see if the page actually has video embeds
                        # This is the "Source-First" gatekeeper
                        ep_res = await scraping_client.get(item['url'], timeout=10.0)
                        html = ep_res.text
                        
                        # Check for common video markers across providers
                        has_video = False
                        if 'kit.start' in html: has_video = True # Oploverz marker
                        if '<iframe' in html: has_video = True    # Generic/Otakudesu/Doronime marker
                        if 'downloadUrl' in html: has_video = True # Download fallback
                        
                        if not has_video:
                            print(f"[Aggregator] Skipping {item['title']} - No video sources found on page.")
                            return None

                        # 2. AniList Enrichment
                        anilist_data = await fetch_anilist_info(item['title'])
                        
                        if anilist_data and anilist_data.get('hdImage'):
                            return {
                                'title': item['title'],
                                'url': item['url'],
                                'img': anilist_data['hdImage'],
                                'banner': anilist_data['banner'],
                                'score': anilist_data['score'],
                                'popularity': anilist_data.get('popularity', 0),
                                'anilistId': anilist_data['anilistId'],
                                'type': 'latest'
                            }
                    except Exception as e:
                        print(f"[Aggregator] Validation error for {item['title']}: {e}")
                    return None

                # Process in parallel with controlled concurrency
                enhanced_items = await asyncio.gather(*(process_and_validate(i) for i in items[:30]))
                valid_items = [i for i in enhanced_items if i]

                # Update Redis with valid, rich data
                final_data = {
                    'latest_episodes': valid_items[:24],
                    'last_updated': int(asyncio.get_event_loop().time())
                }
                
                await upstash_set("home_data", final_data, ex=3600)
                print(f"[Cron] Aggregator Success: {len(valid_items)} items synced to Redis.")
                consecutive_failures = 0
                
        except TimeoutError:
            print("[Cron] Another instance is running, skipping")
        except Exception as e:
            consecutive_failures += 1
            print(f"[Cron] Aggregator Error: {e}")
            await asyncio.sleep(60)
            continue
            
        await asyncio.sleep(3600)



# In-memory cache for AniList
import asyncio
from cachetools import TTLCache
anilist_cache = TTLCache(maxsize=1000, ttl=86400)
anilist_sem = asyncio.Semaphore(5)

GET_ANIME_DETAILS = """
  query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        averageScore
        popularity
        trending
        episodes
        status
        season
        seasonYear
        description(asHtml: false)
        genres
        studios {
          nodes {
            name
            isAnimationStudio
          }
        }
        recommendations {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
            }
          }
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  }
"""

def roman_to_int(s):
    rom_val = {'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000}
    int_val = 0
    for i in range(len(s)):
        if i > 0 and rom_val[s[i]] > rom_val[s[i - 1]]:
            int_val += rom_val[s[i]] - 2 * rom_val[s[i - 1]]
        else:
            int_val += rom_val[s[i]]
    return int_val

async def fetch_anilist_info(title: str):
    # 1. Basic Sanitization
    search_query = re.sub(r'\b(episode|ep|sub indo|batch)\b', '', title, flags=re.IGNORECASE).strip()
    
    # 2. Season Extraction
    season_match = re.search(r'\b(?:S|Season|Part)\s*(\d+|[IVX]+)\b', search_query, re.IGNORECASE)
    target_season = None
    if season_match:
        val = season_match.group(1).upper()
        if val.isdigit():
            target_season = int(val)
        else:
            target_season = roman_to_int(val)
            
    # Remove Season info for better base search
    base_query = re.sub(r'\b(?:S|Season|Part)\s*(\d+|[IVX]+)\b', '', search_query, flags=re.IGNORECASE).strip()
    # Also clean up punctuation like ":" or "-" left behind
    base_query = re.sub(r'[^a-zA-Z0-9 ]', ' ', base_query).strip()
    base_query = re.sub(r'\s+', ' ', base_query)
    
    cache_key = f"{base_query}_S{target_season}" if target_season else base_query
    
    if cache_key in anilist_cache:
        return anilist_cache[cache_key]

    async with anilist_sem:
        try:
            # We search using the raw search_query first, if it fails we will use base_query
            response = await client.post('https://graphql.anilist.co', json={
                'query': GET_ANIME_DETAILS,
                'variables': {'search': search_query}
            })
            
            data = response.json()
            media_list = data.get('data', {}).get('Page', {}).get('media', [])
            
            if not media_list and target_season:
                # Fallback to base_query
                response = await client.post('https://graphql.anilist.co', json={
                    'query': GET_ANIME_DETAILS,
                    'variables': {'search': base_query}
                })
                data = response.json()
                media_list = data.get('data', {}).get('Page', {}).get('media', [])

            if not media_list:
                anilist_cache[cache_key] = None
                return None
                
            # Smart Matching: If target_season exists, try to find a media title that contains that season
            media = media_list[0] # Default to best match
            
            if target_season:
                for m in media_list:
                    titles = [m['title'].get('romaji') or '', m['title'].get('english') or '']
                    combined_title = " ".join(titles).lower()
                    # Check if title contains the season number (e.g. season 4, 4th season, IV)
                    if re.search(fr'\b(?:season\s*{target_season}|{target_season}th\s*season|part\s*{target_season})\b', combined_title) or \
                       re.search(fr'\b(season|part)\s+{target_season}\b', combined_title):
                        media = m
                        break
            
            # Extract studios
            studios = []
            if media.get('studios') and media['studios'].get('nodes'):
                studios = [s['name'] for s in media['studios']['nodes'] if s.get('isAnimationStudio')]
            
            # Extract recommendations
            recs = []
            if media.get('recommendations') and media['recommendations'].get('nodes'):
                for r in media['recommendations']['nodes']:
                    rec_media = r.get('mediaRecommendation')
                    if rec_media:
                        recs.append({
                            'id': rec_media.get('id'),
                            'title': rec_media.get('title', {}).get('english') or rec_media.get('title', {}).get('romaji'),
                            'cover': rec_media.get('coverImage', {}).get('large')
                        })

            result = {
                'anilistId': media['id'],
                'cleanTitle': media['title']['english'] or media['title']['romaji'],
                'nativeTitle': media['title'].get('native'),
                'hdImage': media['coverImage']['extraLarge'] or media['coverImage']['large'],
                'color': media['coverImage'].get('color'),
                'banner': media['bannerImage'],
                'score': media['averageScore'],
                'popularity': media.get('popularity', 0),
                'trending': media.get('trending', 0),
                'description': media.get('description'),
                'genres': media.get('genres', []),
                'episodes': media.get('episodes'),
                'status': media.get('status'),
                'season': media.get('season'),
                'seasonYear': media.get('seasonYear'),
                'studios': studios,
                'recommendations': recs,
                'nextAiringEpisode': media.get('nextAiringEpisode')
            }
            anilist_cache[cache_key] = result
            return result
                
        except Exception as e:
            print(f"[AniList] Error fetching data for '{search_query}': {str(e)}")
            return None

def extract_domain(url: str):
    try:
        return urllib.parse.urlparse(url).hostname.replace('www.', '')
    except:
        return ""

def determine_quality(text: str):
    text = text.lower()
    if '1080' in text or 'fhd' in text: return '1080p'
    if '720' in text or 'hd' in text: return '720p'
    if '480' in text or 'sd' in text: return '480p'
    if '360' in text: return '360p'
    return 'Auto'

async def resolve_4meplayer(url: str, client: httpx.AsyncClient) -> str:
    """Extract direct stream from 4meplayer.pro"""
    try:
        hash_id = url.split('#')[-1]
        if not hash_id:
            return url
        
        # 4meplayer uses API endpoint
        api_url = f"https://oplo2.4meplayer.pro/api/source/{hash_id}"
        res = await client.post(api_url, data={'r': '', 'd': 'oplo2.4meplayer.pro'})
        data = res.json()
        
        if data.get('success') and data.get('data'):
            # Sort by quality, prefer 720p
            sources = data['data']
            # Find 720p first, fallback to highest
            for s in sources:
                if '720' in str(s.get('label', '')):
                    return s.get('file', url)
            # fallback to first source
            return sources[0].get('file', url) if sources else url
    except Exception as e:
        print(f"[4meplayer] resolve error: {e}")
    return url

async def resolve_streamtape(url: str, client: httpx.AsyncClient) -> str:
    """Extract direct mp4 from streamtape"""
    try:
        res = await client.get(url)
        html = res.text
        
        # Streamtape obfuscates with two string concatenations
        match1 = re.search(r"document\.getElementById\('norobotlink'\)\.innerHTML = (.+?);", html)
        match2 = re.search(r"var _0x[\w]+ = '([^']+)'", html)
        
        # More reliable: find the /get_video?id= pattern
        token_match = re.search(r"(//streamtape\.com/get_video\?id=[^&'\"]+&expires=[^&'\"]+&ip=[^&'\"]+&token=[^&'\"]+)", html)
        if token_match:
            return 'https:' + token_match.group(1)
            
        # Alternative extraction
        link_match = re.search(r'get_video\?id=(.+?)&token=(.+?)(?:&|\'|")', html)
        if link_match:
            return f"https://streamtape.com/get_video?id={link_match.group(1)}&token={link_match.group(2)}&stream=1"
    except Exception as e:
        print(f"[streamtape] resolve error: {e}")
    return url

async def resolve_mp4upload(url: str, client: httpx.AsyncClient) -> str:
    """Extract direct mp4 from mp4upload"""
    try:
        res = await client.get(url)
        html = res.text
        
        # Mp4upload embeds src in eval(function(...))
        # Find the direct file URL pattern
        match = re.search(r'"file":"(https?://[^"]+\.mp4[^"]*)"', html)
        if match:
            return match.group(1).replace('\\/', '/')
            
        # Alternative: jwplayer setup
        match2 = re.search(r'file:\s*"(https?://[^"]+)"', html)
        if match2:
            return match2.group(1)
    except Exception as e:
        print(f"[mp4upload] resolve error: {e}")
    return url

async def resolve_doodstream(url: str, client: httpx.AsyncClient) -> str:
    """Extract direct stream from doodstream - multi step"""
    try:
        res = await client.get(url)
        html = res.text
        
        # Step 1: get pass_md5 URL
        pass_match = re.search(r'/pass_md5/[^\'\"]+', html)
        if not pass_match:
            return url
            
        pass_url = 'https://dood.to' + pass_match.group(0)
        
        # Step 2: fetch pass URL with referer
        res2 = await client.get(pass_url, headers={'Referer': url})
        token = res2.text
        
        # Step 3: construct final URL
        import random, string, time
        rand = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        final_url = f"{token}{rand}?token={pass_match.group(0).split('/')[-1]}&expiry={int(time.time())}"
        return final_url
    except Exception as e:
        print(f"[doodstream] resolve error: {e}")
    return url

async def resolve_video_source(url: str) -> str:
    client_local = httpx.AsyncClient(
        transport=SSRFSafeTransport(),
        verify=False, 
        headers=HEADERS, 
        timeout=10.0, 
        follow_redirects=True
    )
    try:
        if 'desustream' in url or 'desudrives' in url:
            fetch_url = f"{url}&mode=json" if '?' in url else f"{url}?mode=json"
            res = await client_local.get(fetch_url)
            data = res.json()
            if data.get('ok') and data.get('video'):
                return await resolve_video_source(data['video'].replace('&amp;', '&'))
                
        elif 'blogger.com' in url:
            res = await client_local.get(url)
            match = re.search(r'"play_url":"([^"]+)"', res.text)
            if match:
                return match.group(1).encode('utf-8').decode('unicode_escape')
                
        elif '4meplayer' in url or 'oplo2.' in url:
            return await resolve_4meplayer(url, client_local)
            
        elif 'streamtape' in url:
            return await resolve_streamtape(url, client_local)
            
        elif 'mp4upload' in url:
            return await resolve_mp4upload(url, client_local)
            
        elif 'dood' in url or 'doodstream' in url:
            return await resolve_doodstream(url, client_local)
            
    except Exception as e:
        print(f"Resolve error for {url}: {e}")
    finally:
        await client_local.aclose()
    
    return url

@app.get('/api/home')
async def get_home():
    try:
        data = await upstash_get("home_data")
        if data:
            return {'success': True, 'data': data}
        else:
            # Trigger manual background run if empty, wait slightly then return error
            asyncio.create_task(background_scrape_job())
            return {'success': False, 'message': 'Data is being generated by cron job. Please refresh in a minute.'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/series')
async def get_series():
    try:
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

        return {'success': True, 'data': series}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/series-detail')
async def get_series_detail(url: str = Query(..., description="Target URL of the series")):
    try:
        r = await scraping_client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        
        # Extract title from slug to ensure clean AniList query
        parts = url.strip('/').split('/')
        slug_title = parts[-1].replace('-', ' ').title() if len(parts) > 0 else "Unknown"
        
        poster_meta = soup.find('meta', property="og:image")
        poster = poster_meta.get('content') if poster_meta else None
        
        desc_meta = soup.find('meta', property="og:description")
        desc = desc_meta.get('content') if desc_meta else ""
        
        # Oploverz hides episode list in Svelte payload
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
            
            # Sort episodes descending (latest first)
            episodes.sort(key=lambda x: x['number'], reverse=True)
                
        # Enhance with AniList data to override Oploverz SEO spam
        anilist_data = await fetch_anilist_info(slug_title)
        
        fallback_desc = "Tidak ada sinopsis resmi yang tersedia untuk seri anime ini."
        if desc and "Oploverz" not in desc and "Plover" not in desc:
            fallback_desc = desc
            
        return {
            'success': True, 
            'data': {
                'title': slug_title, # Keep slug title to prevent season mismatches from AniList
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
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/episodes')
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
        
        # Robust Svelte payload extraction
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
            
            # Sort episodes descending (latest first)
            episodes.sort(key=lambda x: x['number'], reverse=True)
                
        # Return episodes in chronological order if possible (Oploverz usually lists descending, so we might reverse it or leave it)
        # Let's leave it as is, which is usually newest first.
        
        return {'success': True, 'data': episodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/scrape')
async def scrape_episode(url: str = Query(..., description="Episode URL to scrape")):
    try:
        validate_scrape_url(url)
    except SSRFError as e:
        raise HTTPException(status_code=400, detail=f"URL tidak valid: {str(e)}")

    try:
        r = await scraping_client.get(url)
        if r.status_code in (301, 302, 303, 307, 308):
            # Manual redirect handling for safety
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

        # Extract clean title for HistoryTracker
        title_tag = soup.find('title')
        raw_title = title_tag.text if title_tag else 'Unknown Title'
        anime_title = raw_title.split('Episode')[0].replace('Nonton', '').replace(' | Oploverz', '').strip()
        
        anilist_data = await fetch_anilist_info(anime_title)
        poster = anilist_data['hdImage'] if anilist_data else ""

        # --- SVELTE PAYLOAD EXTRACTION (Robust Method) ---
        downloads = []
        payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', html, re.DOTALL)
        if payload_match:
            payload = payload_match.group(1)
            stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', payload)
            
            # Extract Downloads
            down_match = re.search(r'downloadUrl:\s*(\[\{format.*?)\]\}\]\}', payload, re.DOTALL)
            if down_match:
                down_str = down_match.group(1) + ']}]'
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
            # Fallback if kit.start is missing
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

        # Resolve video sources asynchronously
        # import asyncio  # Redundant, moved to top
        async def process_embed(embed):
            resolved_url = await resolve_video_source(embed['url'])
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


@app.get('/api/multi-source')
async def get_multi_source(title: str = Query(..., description="Anime clean title"), ep: int = Query(..., description="Episode number"), oploverz_url: str = Query(None, description="Oploverz exact episode URL")):
    """Aggregator endpoint that fetches sources from multiple providers concurrently"""
    try:
        tasks = []
        
        # 1. Oploverz Strategy
        # If we already have the oploverz url from the frontend, we use it directly
        if oploverz_url:
            tasks.append(oploverz_provider.get_episode_sources(oploverz_url))
        
        # 2. Otakudesu Strategy
        # We need to search Otakudesu for the title, find the matching series, find the matching episode, and extract sources.
        async def fetch_otakudesu():
            try:
                # Naive search approach just for demonstration
                # Search using the clean title on Otakudesu
                search_url = f"https://otakudesu.cloud/?s={urllib.parse.quote_plus(title)}&post_type=anime"
                r = await otakudesu_provider.client.get(search_url)
                soup = BeautifulSoup(r.text, 'lxml')
                
                # Find first search result
                first_result = soup.select_one('ul.chivsrc li h2 a')
                if not first_result:
                    return {'sources': []}
                
                series_url = first_result.get('href')
                
                # Get series details (episode list)
                details = await otakudesu_provider.get_anime_detail(series_url)
                
                # Find matching episode
                target_ep_url = None
                for e in details.get('episodes', []):
                    # Attempt to extract episode number from Otakudesu title e.g., "Episode 12 Sub Indo"
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
        
        # Run concurrently
        results = await asyncio.gather(*tasks)
        
        all_sources = []
        downloads = []
        
        # Process Oploverz results
        if len(results) > 0 and oploverz_url:
            op_res = results[0]
            # Oploverz still needs resolving
            raw_embeds = op_res.get('sources', [])
            downloads = op_res.get('downloads', [])
            
            async def process_embed(embed):
                resolved_url = await resolve_video_source(embed['url'])
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
        
        # Process Otakudesu results
        if len(results) > 1 or not oploverz_url:
            ot_res = results[1] if oploverz_url else results[0]
            ot_raw_embeds = ot_res.get('sources', [])
            
            # Resolve Otakudesu sources using our generic resolvers
            async def process_otakudesu(embed):
                resolved_url = await resolve_video_source(embed['resolved']) # Actually it is raw URL in 'resolved' key from provider
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
            
        # Sort combined sources
        rank = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}
        all_sources.sort(key=lambda x: rank.get(x['quality'], 1), reverse=True)

        return {
            'success': True, 
            'sources': all_sources,
            'downloads': downloads
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
