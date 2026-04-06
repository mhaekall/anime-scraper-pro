import sys
import re

with open('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend/main.py', 'r') as f:
    code = f.read()

# 1. Add imports and scraping client
new_clients = '''
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
'''
code = code.replace(
    '# Async HTTP Client with proper TLS config\nclient = httpx.AsyncClient(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)',
    new_clients
)

# 2. Update background_scrape_job to use DistributedLock
old_cron = '''async def background_scrape_job():
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
            )'''

new_cron = '''async def background_scrape_job():
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
                print("[Cron] Starting background scrape job...")
                url1 = 'https://o.oploverz.ltd/'
                url2 = 'https://o.oploverz.ltd/page/2/'
                url_series = 'https://o.oploverz.ltd/series/'
                
                r1, r2, r_series = await asyncio.gather(
                    scraping_client.get(url1),
                    scraping_client.get(url2),
                    scraping_client.get(url_series)
                )
'''
code = code.replace(old_cron, new_cron)

# Update the end of background_scrape_job
old_cron_end = '''            await upstash_set("home_data", final_data, ex=3600)
            print("[Cron] Scrape job finished. Saved to Redis.")
        except Exception as e:
            print(f"[Cron] Error: {e}")
            
        await asyncio.sleep(3600)'''

new_cron_end = '''            await upstash_set("home_data", final_data, ex=3600)
            print("[Cron] Scrape job finished. Saved to Redis.")
            consecutive_failures = 0
        except TimeoutError:
            print("[Cron] Another instance is running, skipping")
        except Exception as e:
            consecutive_failures += 1
            print(f"[Cron] Error: {e}")
            backoff = min(60 * (2 ** (consecutive_failures - 1)), 900)
            await asyncio.sleep(backoff)
            continue
            
        await asyncio.sleep(3600)'''
code = code.replace(old_cron_end, new_cron_end)

# 3. Update scrape_episode
old_scrape = '''@app.get('/api/scrape')
async def scrape_episode(url: str = Query(..., description="Episode URL to scrape")):
    try:
        r = await client.get(url)'''

new_scrape = '''@app.get('/api/scrape')
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
                r = await scraping_client.get(next_url)'''
code = code.replace(old_scrape, new_scrape)

# Update other endpoints to use scraping_client
code = code.replace("r = await client.get(url)", "r = await scraping_client.get(url)")
code = code.replace("client_local = httpx.AsyncClient(", "client_local = httpx.AsyncClient(\n        transport=SSRFSafeTransport(),")

with open('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend/main.py', 'w') as f:
    f.write(code)
