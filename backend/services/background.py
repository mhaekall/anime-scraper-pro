import asyncio
import time
from bs4 import BeautifulSoup
from utils.distributed_lock import DistributedLock
from db.connection import database
from services.config import BASE_URL
from services.clients import scraping_client
from services.cache import upstash_get, upstash_set, upstash_del
from services.anilist import fetch_anilist_info
from services.db import upsert_anime_db

async def background_scrape_job():
    consecutive_failures = 0
    while True:
        lock = DistributedLock(
            upstash_get_fn=upstash_get,
            upstash_set_fn=upstash_set,
            upstash_del_fn=upstash_del,
            key="background_scrape"
        )
        try:
            async with lock:
                print("[Cron] Starting Aggregator Scrape Job...")
                
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
                        ep_res = await scraping_client.get(item['url'], timeout=10.0)
                        html = ep_res.text
                        
                        has_video = False
                        if 'kit.start' in html: has_video = True
                        if '<iframe' in html: has_video = True
                        if 'downloadUrl' in html: has_video = True
                        
                        if not has_video:
                            return None

                        anilist_data = await fetch_anilist_info(item['title'])
                        
                        if anilist_data and anilist_data.get('hdImage'):
                            provider_slug = item['url'].strip('/').split('/')[-1]
                            asyncio.create_task(upsert_anime_db(anilist_data, 'oploverz', provider_slug))
                            
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

                sem = asyncio.Semaphore(5)
                async def bounded_validate(item):
                    async with sem:
                        return await process_and_validate(item)

                enhanced_items = await asyncio.gather(*(bounded_validate(i) for i in items[:30]))
                valid_items = [i for i in enhanced_items if i]
                
                top_anime = []
                try:
                    query_top = """
                        SELECT meta."anilistId", meta."cleanTitle" as title, meta."coverImage" as img, 
                               meta."bannerImage" as banner, meta."score", m."providerSlug", m."providerId"
                        FROM anime_metadata meta
                        LEFT JOIN anime_mappings m ON meta."anilistId" = m."anilistId"
                        ORDER BY meta.score DESC NULLS LAST
                        LIMIT 10
                    """
                    top_anime_records = await database.fetch_all(query=query_top)
                    for r in top_anime_records:
                        top_item = dict(r)
                        if top_item.get('providerSlug') and top_item.get('providerId') == 'oploverz':
                            top_item['url'] = f"https://o.oploverz.ltd/series/{top_item['providerSlug']}"
                        else:
                            top_item['url'] = ""
                        top_anime.append(top_item)
                except Exception as db_e:
                    print(f"[Cron] Error fetching top anime from DB: {db_e}")

                now = int(time.time())
                payload = {
                    'data': {
                        'latest_episodes': valid_items[:24],
                        'top_anime': top_anime,
                        'last_updated': now
                    },
                    'stale_at': now + 3600,
                    'expires_at': now + 86400,
                    'created_at': now
                }
                
                await upstash_set("home_data", payload, ex=86400)
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
