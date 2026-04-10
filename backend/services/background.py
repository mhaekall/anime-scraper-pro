import asyncio
import time
import re
from bs4 import BeautifulSoup
from utils.distributed_lock import DistributedLock
from db.connection import database
from services.config import BASE_URL
from services.clients import scraping_client
from services.cache import upstash_get, upstash_set, upstash_del
from services.anilist import fetch_anilist_info
from services.db import upsert_mapping_atomic
from services.pipeline import sync_anime_episodes

async def scrape_oploverz_home():
    """Fetch latest from Oploverz"""
    try:
        r1, r2 = await asyncio.gather(
            scraping_client.get('https://o.oploverz.ltd/'),
            scraping_client.get('https://o.oploverz.ltd/page/2/')
        )
        combined_html = r1.text + r2.text
        soup = BeautifulSoup(combined_html, 'lxml')
        items = []
        for a in soup.select('a[href*="/episode/"]'):
            img_tag = a.find('img')
            img = img_tag.get('src') if img_tag else None
            raw_title = img_tag.get('alt') or a.get('title') if img_tag else None
            if raw_title:
                clean_title = raw_title.split('Episode')[0].replace('Nonton', '').replace(' | Oploverz', '').strip()
                if clean_title:
                    url = a.get('href') if a.get('href').startswith('http') else BASE_URL + a.get('href')
                    slug = url.strip('/').split('/')[-1]
                    items.append({'title': clean_title, 'url': url, 'provider_id': 'oploverz', 'provider_slug': slug, 'raw_img': img})
        return items
    except Exception as e:
        print(f"[Cron] Oploverz scrape error: {e}")
        return []

async def scrape_otakudesu_home():
    """Fetch latest from Otakudesu"""
    try:
        r = await scraping_client.get('https://otakudesu.blog/')
        soup = BeautifulSoup(r.text, 'lxml')
        items = []
        for div in soup.select('.venz ul li'):
            a = div.find('a')
            if a:
                title_text = a.text.strip()
                url = a.get('href', '')
                if '/anime/' in url:
                    slug = url.strip('/').split('/')[-1]
                    clean_title = title_text.split(' Episode')[0].strip()
                    items.append({'title': clean_title, 'url': url, 'provider_id': 'otakudesu', 'provider_slug': slug, 'raw_img': None})
        return items
    except Exception as e:
        print(f"[Cron] Otakudesu scrape error: {e}")
        return []

async def scrape_samehadaku_home():
    """Fetch latest from Samehadaku"""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0"}
        r = await scraping_client.get('https://v2.samehadaku.how/', headers=headers)
        soup = BeautifulSoup(r.text, 'lxml')
        items = []
        for li in soup.select('.post-show ul li'):
            a = li.select_one('.entry-title a')
            if a:
                title_text = a.text.strip()
                url = a.get('href', '')
                if '/anime/' in url:
                    slug = url.strip('/').split('/')[-1]
                    items.append({'title': title_text, 'url': url, 'provider_id': 'samehadaku', 'provider_slug': slug, 'raw_img': None})
        return items
    except Exception as e:
        print(f"[Cron] Samehadaku scrape error: {e}")
        return []

async def scrape_doronime_home():
    """Fetch latest from Doronime"""
    try:
        r = await scraping_client.get('https://doronime.id/')
        soup = BeautifulSoup(r.text, 'lxml')
        items = []
        for item in soup.select('.latest-post-item'):
            a = item.find('a')
            if a and '/episode/' in a.get('href', ''):
                title_text = a.get('title') or a.text.strip()
                url = a.get('href')
                slug = url.strip('/').split('/')[-1]
                clean_title = re.sub(r'(?:episode|eps?)[.\s]*\d+.*$', '', title_text, flags=re.IGNORECASE).strip()
                items.append({'title': clean_title, 'url': url, 'provider_id': 'doronime', 'provider_slug': slug, 'raw_img': None})
        return items
    except Exception as e:
        print(f"[Cron] Doronime scrape error: {e}")
        return []

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
                print("[Cron] Starting Multi-Source Aggregator Scrape Job...")
                
                # Fetch from all providers concurrently to maximize direct wrapper discoveries (DesuDrives, 4meplayer, Wibufile)
                results = await asyncio.gather(
                    scrape_kuronime_home(),
                    scrape_samehadaku_home(),
                    scrape_otakudesu_home(),
                    scrape_oploverz_home(),
                    scrape_doronime_home(),
                    return_exceptions=True
                )
                
                all_items = []
                for res in results:
                    if isinstance(res, list):
                        all_items.extend(res)

                # Deduplicate by title
                seen_titles = set()
                items = []
                for item in all_items:
                    t = item['title'].lower()
                    if t not in seen_titles:
                        seen_titles.add(t)
                        items.append(item)

                async def process_and_validate(item):
                    try:
                        anilist_data = await fetch_anilist_info(item['title'])
                        if anilist_data:
                            provider_id = item['provider_id']
                            provider_slug = item['provider_slug']
                            clean_title = anilist_data.get("cleanTitle") or anilist_data.get("nativeTitle", "")
                            cover_image = anilist_data.get("hdImage") or anilist_data.get("coverImage", "")
                            
                            # Atomic mapping resolution
                            await upsert_mapping_atomic(
                                anilist_id=anilist_data['anilistId'],
                                provider_id=provider_id,
                                provider_slug=provider_slug,
                                clean_title=clean_title,
                                cover_image=cover_image
                            )
                            
                            print(f"[Cron] Syncing episodes for {item['title']} (ID: {anilist_data['anilistId']}) from {provider_id}...")
                            from services.queue import enqueue_sync
                            await enqueue_sync(anilist_data['anilistId'])
                            
                            return {
                                'title': clean_title,
                                'url': item['url'],
                                'img': cover_image,
                                'banner': anilist_data.get('banner'),
                                'score': anilist_data.get('score'),
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

                enhanced_items = await asyncio.gather(*(bounded_validate(i) for i in items[:40]))
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
                        from services.pipeline import build_provider_series_url
                        top_item['url'] = build_provider_series_url(top_item.get('providerId', ''), top_item.get('providerSlug', ''))
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
            import traceback
            traceback.print_exc()
            print(f"[Cron] Aggregator Error: {e}")
            await asyncio.sleep(60)
            continue
            
        await asyncio.sleep(3600)
 from DB: {db_e}")

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
            import traceback
            traceback.print_exc()
            print(f"[Cron] Aggregator Error: {e}")
            await asyncio.sleep(60)
            continue
            
        await asyncio.sleep(3600)
