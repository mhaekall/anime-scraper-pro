import re
import urllib.parse
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
from bs4 import BeautifulSoup

app = FastAPI(title="Anime Scraper API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_URL = 'https://anime.oploverz.ac'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1'
}

# Async HTTP Client with proper TLS config
client = httpx.AsyncClient(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)

# In-memory cache for AniList
import asyncio
from cachetools import TTLCache
anilist_cache = TTLCache(maxsize=1000, ttl=86400)
anilist_sem = asyncio.Semaphore(5)

GET_ANIME_DETAILS = """
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      id
      title {
        romaji
        english
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
      description(asHtml: false)
      genres
    }
  }
"""

async def fetch_anilist_info(title: str):
    search_query = re.sub(r'\b(episode|ep|sub indo|batch)\b', '', title, flags=re.IGNORECASE).strip()
    
    if search_query in anilist_cache:
        return anilist_cache[search_query]

    async with anilist_sem:
        try:
            response = await client.post('https://graphql.anilist.co', json={
                'query': GET_ANIME_DETAILS,
                'variables': {'search': search_query}
            })
            
            data = response.json()
            if not data or 'data' not in data:
                anilist_cache[search_query] = None
                return None
                
            media = data.get('data', {}).get('Media')
            
            if media:
                result = {
                    'cleanTitle': media['title']['english'] or media['title']['romaji'],
                    'hdImage': media['coverImage']['extraLarge'] or media['coverImage']['large'],
                    'banner': media['bannerImage'],
                    'score': media['averageScore'],
                    'popularity': media.get('popularity', 0),
                    'trending': media.get('trending', 0),
                    'description': media.get('description'),
                    'genres': media.get('genres', [])
                }
                anilist_cache[search_query] = result
                return result
                
            anilist_cache[search_query] = None
            return None
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

async def resolve_video_source(url: str):
    # This function takes an iframe URL and returns a direct video URL if possible.
    try:
        if 'desustream' in url or 'desudrives' in url:
            # Desustream uses a JSON mode to get the video link (often a Blogger URL)
            fetch_url = f"{url}&mode=json" if '?' in url else f"{url}?mode=json"
            res = await client.get(fetch_url)
            data = res.json()
            if data.get('ok') and data.get('video'):
                return await resolve_video_source(data['video'].replace('&amp;', '&'))
                
        if 'blogger.com' in url:
            # Blogger video page
            res = await client.get(url)
            # Find play_url
            match = re.search(r'"play_url":"([^"]+)"', res.text)
            if match:
                decoded_url = match.group(1).encode('utf-8').decode('unicode_escape')
                return decoded_url
                
    except Exception as e:
        print(f"Resolve error for {url}: {e}")
        pass
    
    return url # Return original if cannot resolve

@app.get('/api/home')
async def get_home():
    try:
        url1 = 'https://o.oploverz.ltd/'
        url2 = 'https://o.oploverz.ltd/page/2/'
        url_series = 'https://o.oploverz.ltd/series/'
        
        # Fetch multiple pages concurrently to build a much larger data pool
        r1, r2, r_series = await asyncio.gather(
            client.get(url1),
            client.get(url2),
            client.get(url_series)
        )
        
        items = []
        seen = set()

        # Combine HTML from page 1 and 2 for Latest Episodes
        combined_html = r1.text + r2.text
        soup = BeautifulSoup(combined_html, 'lxml')

        for a in soup.select('a[href*="/episode/"]'):
            img_tag = a.find('img')
            img = img_tag.get('src') if img_tag else None
            
            title = img_tag.get('alt') or a.get('title') if img_tag else None
            if title and title.startswith('cover-'):
                title = title.replace('cover-', '').replace('-', ' ').title()
            
            if not title or not title.strip():
                parts = a.get('href').split('/')
                if len(parts) > 2:
                    title = parts[2].replace('-', ' ').title()
            
            if img and 'poster' in img:
                href = a.get('href')
                series_url_part = href.split('/episode/')[0]
                
                if title and title not in seen:
                    seen.add(title)
                    series_url = series_url_part if series_url_part.startswith('http') else BASE_URL + series_url_part
                    ep_url = href if href.startswith('http') else BASE_URL + href
                    
                    items.append({
                        'title': title,
                        'url': series_url,
                        'episodeUrl': ep_url,
                        'img': img
                    })

        series_list = []
        seen_series = set()
        soup_series = BeautifulSoup(r_series.text, 'lxml')
        
        for a in soup_series.select('a[href^="/series/"]'):
            href = a.get('href')
            if href and len(href) > 8:
                parts = href.strip('/').split('/')
                if len(parts) >= 2 and parts[0] == 'series':
                    slug = parts[1]
                    if slug not in seen_series:
                        title = slug.replace('-', ' ').title()
                        seen_series.add(slug)
                        
                        full_url = href if href.startswith('http') else BASE_URL + href
                        series_list.append({
                            'title': title,
                            'url': full_url,
                            'img': None
                        })
                
        # Limit to top 40 items for the homepage to get a rich pool for sorting by popularity
        series_list = series_list[:40]
        
        async def enhance_item(item):
            anilist_data = await fetch_anilist_info(item['title'])
            if anilist_data:
                return {
                    **item,
                    'title': item['title'], 
                    'img': anilist_data['hdImage'] or item['img'],
                    'banner': anilist_data['banner'],
                    'score': anilist_data['score'],
                    'popularity': anilist_data.get('popularity', 0)
                }
            return item
            
        enhanced_items = await asyncio.gather(*(enhance_item(item) for item in items[:30]))
        enhanced_series = await asyncio.gather(*(enhance_item(s) for s in series_list))
        
        filtered_items = [i for i in enhanced_items if i.get('img')]
        filtered_series = [s for s in enhanced_series if s.get('score') is not None]
        
        # Sort Popular Series by real AniList popularity
        filtered_series.sort(key=lambda x: x.get('popularity', 0), reverse=True)
        
        return {
            'success': True, 
            'data': {
                'latest_episodes': filtered_items[:24],
                'popular_series': filtered_series[:20]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/series')
async def get_series():
    try:
        url = 'https://o.oploverz.ltd/series'
        r = await client.get(url)
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
        r = await client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        
        # Extract title from slug to ensure clean AniList query
        parts = url.strip('/').split('/')
        slug_title = parts[-1].replace('-', ' ').title() if len(parts) > 0 else "Unknown"
        
        poster_meta = soup.find('meta', property="og:image")
        poster = poster_meta.get('content') if poster_meta else None
        
        desc_meta = soup.find('meta', property="og:description")
        desc = desc_meta.get('content') if desc_meta else ""
        
        # Oploverz hides episode list in Svelte payload
        matches = re.findall(r'episodeNumber:"([^"]+)"', r.text)
        
        episodes = []
        seen = set()
        for ep_num in matches:
            if ep_num not in seen:
                seen.add(ep_num)
                full_url = f"{url.rstrip('/')}/episode/{ep_num}"
                episodes.append({'title': f'Episode {ep_num}', 'url': full_url})
                
        # Enhance with AniList data to override Oploverz SEO spam
        anilist_data = await fetch_anilist_info(slug_title)
        
        fallback_desc = "Tidak ada sinopsis resmi yang tersedia untuk seri anime ini."
        if desc and "Oploverz" not in desc and "Plover" not in desc:
            fallback_desc = desc
            
        return {
            'success': True, 
            'data': {
                'title': slug_title, # Keep slug title to prevent season mismatches from AniList
                'poster': anilist_data['hdImage'] if anilist_data else poster,
                'banner': anilist_data['banner'] if anilist_data else None,
                'synopsis': anilist_data['description'] if anilist_data and anilist_data['description'] else fallback_desc,
                'score': anilist_data['score'] if anilist_data else None,
                'genres': anilist_data['genres'] if anilist_data else [],
                'episodes': episodes
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/episodes')
async def get_episodes(url: str = Query(..., description="Target URL of the series")):
    try:
        r = await client.get(url)
        
        episodes = []
        seen = set()
        
        # Oploverz hides episode list in Svelte payload
        matches = re.findall(r'episodeNumber:"([^"]+)"', r.text)
        
        for ep_num in matches:
            if ep_num not in seen:
                seen.add(ep_num)
                full_url = f"{url.rstrip('/')}/episode/{ep_num}"
                episodes.append({'title': f'Episode {ep_num}', 'url': full_url})
                
        # Return episodes in chronological order if possible (Oploverz usually lists descending, so we might reverse it or leave it)
        # Let's leave it as is, which is usually newest first.
        
        return {'success': True, 'data': episodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/scrape')
async def scrape_episode(url: str = Query(..., description="Episode URL to scrape")):
    try:
        r = await client.get(url)
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

        # --- SVELTE PAYLOAD EXTRACTION ---
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
            'anime': {
                'title': anime_title,
                'poster': poster
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
