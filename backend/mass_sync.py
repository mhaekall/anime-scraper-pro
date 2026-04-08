import asyncio
import sys
import os
import re

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import database
from services.pipeline import sync_anime_episodes
from services.anilist import fetch_anilist_info
from services.db import upsert_mapping_atomic
from services.clients import scraping_client
from services.transport import ProviderTransport
from services.cache import get_reconciler_cache, set_reconciler_cache
from services.reconciler import reconciler
from bs4 import BeautifulSoup

async def mass_sync():
    await database.connect()
    print("🚀 Starting Mass Sync (Fixed Logic)...")

    targets = [
        {'id': 'oploverz', 'url': 'https://o.oploverz.ltd/'},
        {'id': 'otakudesu', 'url': 'https://otakudesu.cloud/'},
        {'id': 'samehadaku', 'url': 'https://v2.samehadaku.how/'}
    ]

    found_animes = []

    for target in targets:
        try:
            print(f"Scraping {target['id']} homepage...")
            client = ProviderTransport.get_client()
            
            # Custom headers for samehadaku
            headers = {}
            if target['id'] == 'samehadaku':
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0"}
            
            res = await client.get(target['url'], headers=headers)
            soup = BeautifulSoup(res.text, 'lxml')
            
            if target['id'] == 'oploverz':
                # ... existing oploverz logic ...
                for a in soup.find_all('a', href=re.compile(r'/series/')):
                    href = a.get('href', '').strip('/')
                    parts = href.split('/')
                    if len(parts) >= 2 and parts[0] == 'series':
                        slug = parts[1]
                        if slug == 'episode': continue
                        title_text = ""
                        h3 = a.find('h3')
                        if h3: title_text = h3.text.strip()
                        if not title_text:
                            img = a.find('img')
                            if img:
                                alt = img.get('alt', '')
                                if 'Tonton Sekarang' not in alt and 'Banner' not in alt:
                                    title_text = alt
                        if not title_text:
                            title_text = a.get('title') or a.text.strip()
                        if any(x in title_text for x in ['Tonton Sekarang', 'Oploverz', 'Klik di sini']):
                            title_text = slug.replace('-', ' ').title()
                        title_text = title_text.split('Episode')[0].strip()
                        if title_text and slug:
                            found_animes.append((title_text, 'oploverz', slug))
            
            elif target['id'] == 'otakudesu':
                # ... existing otakudesu logic ...
                for div in soup.select('.venz ul li'):
                    a = div.find('a')
                    if a:
                        title = a.text.strip()
                        url = a.get('href', '')
                        if '/anime/' in url:
                            slug = url.strip('/').split('/')[-1]
                            if slug and title:
                                found_animes.append((title, 'otakudesu', slug))

            elif target['id'] == 'samehadaku':
                # Samehadaku logic
                for li in soup.select('.post-show ul li'):
                    a = li.select_one('.entry-title a')
                    if a:
                        title = a.text.strip()
                        url = a.get('href', '')
                        if '/anime/' in url:
                            slug = url.strip('/').split('/')[-1]
                            if slug and title:
                                found_animes.append((title, 'samehadaku', slug))

        except Exception as e:
            import traceback
            print(f"Error scraping {target['id']}: {e}")
            traceback.print_exc()

    # Deduplicate by slug
    unique_map = {}
    for title, prov, slug in found_animes:
        unique_map[(prov, slug)] = title

    by_title = {}
    for (prov, slug), title in unique_map.items():
        if title not in by_title:
            by_title[title] = []
        by_title[title].append((prov, slug))

    reconcile_items = []
    for (prov, slug), title in unique_map.items():
        cached = await get_reconciler_cache(prov, slug)
        if not cached:
            reconcile_items.append({
                "provider_id": prov,
                "provider_slug": slug,
                "raw_title": title
            })

    print(f"Found {len(reconcile_items)} uncached mappings. Starting Reconciler processing...")
    
    results = await reconciler.reconcile_batch(reconcile_items, concurrency=5)
    
    print(f"Reconciliation complete. Successful matches: {len(results)}")

    count = 0
    synced_aids = set()
    for res in results:
        try:
            aid = res.canonical_anilist_id
            candidate = res.providers[0]
            
            anilist_data = res.anilist_metadata
            
            if anilist_data:
                prov = candidate.provider_id
                slug = candidate.provider_slug
                
                # Cache the result
                await set_reconciler_cache(prov, slug, {
                    "anilist_id": aid,
                    "confidence": candidate.confidence,
                    "matched_via": candidate.matched_via
                })
                
                # Cleanup old numeric slugs
                if not slug.isdigit():
                    await database.execute(
                        'DELETE FROM anime_mappings WHERE "anilistId" = :aid AND "providerId" = :pid AND "providerSlug" ~ \'^[0-9]+$\'',
                        values={"aid": aid, "pid": prov}
                    )
                
                clean_title = anilist_data.get("cleanTitle") or anilist_data.get("nativeTitle", "")
                cover_image = anilist_data.get("hdImage") or anilist_data.get("coverImage", "")
                
                await upsert_mapping_atomic(
                    anilist_id=aid,
                    provider_id=prov,
                    provider_slug=slug,
                    clean_title=clean_title,
                    cover_image=cover_image
                )
                
                if aid not in synced_aids:
                    print(f"[{count+1}] -> Synced Mapping & Triggering episodes for {res.canonical_title} (ID: {aid})...")
                    await sync_anime_episodes(aid)
                    synced_aids.add(aid)
                    count += 1
            else:
                print(f"   -> Failed to fetch AniList data for {candidate.raw_title}")
        except Exception as e:
            print(f"   -> Error processing match: {e}")

    print(f"✅ Mass Sync Finished.")
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(mass_sync())