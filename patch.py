import sys
import re

with open('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend/main.py', 'r') as f:
    code = f.read()

# 1. Update FastAPI app declaration
code = code.replace('app = FastAPI(title="Anime Scraper API", version="2.0.0")', 
'''from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(background_scrape_job())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(title="Anime Scraper API", version="2.0.0", lifespan=lifespan)''')

# 2. Add Upstash helpers
upstash_code = '''
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
    while True:
        try:
            print("[Cron] Starting background scrape job...")
            url1 = 'https://o.oploverz.ltd/'
            url2 = 'https://o.oploverz.ltd/page/2/'
            url_series = 'https://o.oploverz.ltd/series/'
            
            r1, r2, r_series = await asyncio.gather(
                client.get(url1),
                client.get(url2),
                client.get(url_series)
            )
            
            items = []
            seen = set()

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
            
            filtered_series.sort(key=lambda x: x.get('popularity', 0), reverse=True)
            
            final_data = {
                'latest_episodes': filtered_items[:24],
                'popular_series': filtered_series[:20]
            }
            
            await upstash_set("home_data", final_data, ex=3600)
            print("[Cron] Scrape job finished. Saved to Redis.")
        except Exception as e:
            print(f"[Cron] Error: {e}")
            
        await asyncio.sleep(3600)
'''

code = code.replace("client = httpx.AsyncClient(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)",
"client = httpx.AsyncClient(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)\n" + upstash_code)

# 3. Replace get_home
new_get_home = '''@app.get('/api/home')
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
'''

code = re.sub(r"@app\.get\('/api/home'\).*?(?=@app\.get\('/api/series'\))", new_get_home + "\n", code, flags=re.DOTALL)

with open('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend/main.py', 'w') as f:
    f.write(code)
