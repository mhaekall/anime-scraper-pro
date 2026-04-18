import asyncio
import os
import sys
import httpx
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(ROOT_DIR, "apps/api"))

load_dotenv(os.path.join(ROOT_DIR, "apps/api/.env"))
QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
QSTASH_URL = os.getenv("QSTASH_URL", "https://qstash.upstash.io").rstrip("/")

db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

from databases import Database
from apps.api.services.stream_cache import _get_all_stream_sources

async def force_ingest():
    db = Database(db_url)
    await db.connect()
    
    row_wis = await db.fetch_one('SELECT id, "episodeNumber" FROM episodes WHERE "anilistId" = 182300 AND "episodeNumber" = 1.0')
    rows_witch = await db.fetch_all('SELECT id, "episodeNumber" FROM episodes WHERE "anilistId" = 147105 AND "episodeNumber" IN (2.0, 3.0)')
    
    targets = []
    if row_wis:
        targets.append((row_wis['id'], 182300, 1.0))
    for r in rows_witch:
        targets.append((r['id'], 147105, float(r['episodeNumber'])))
        
    for ep_id, aid, ep_num in targets:
        print(f"\n--- Memproses {aid} Ep {ep_num} ---")
        
        sources = await _get_all_stream_sources(aid, ep_num)
        if sources:
            direct_url = sources[0].get("url", "")
            provider_id = sources[0].get("source", "unknown")
            print(f"Direct URL found: {direct_url[:50]}...")
            
            if direct_url and "tg-proxy" not in direct_url:
                target_url = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/webhook/ingest"
                
                headers = {
                    "Authorization": f"Bearer {QSTASH_TOKEN}",
                    "Content-Type": "application/json",
                    "Upstash-Retries": "5",
                }
                
                payload = {
                    "episode_id": ep_id,
                    "anilist_id": aid,
                    "provider_id": provider_id,
                    "episode_number": ep_num,
                    "direct_url": direct_url
                }
                
                url = f"{QSTASH_URL}/v2/publish/{target_url}"
                try:
                    response = httpx.post(url, headers=headers, json=payload)
                    if response.status_code >= 200 and response.status_code < 300:
                        data = response.json()
                        print(f"✅ QStash Job Queued for {aid} Ep {ep_num}! Message ID: {data.get('messageId')}")
                    else:
                        print(f"❌ QStash Error: {response.status_code} - {response.text}")
                except Exception as e:
                    print(f"🚨 Error: {e}")
            else:
                print(f"Already ingested or invalid URL: {direct_url[:50]}...")
        else:
            print(f"No stream found for {aid} Ep {ep_num}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(force_ingest())