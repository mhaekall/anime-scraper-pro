import asyncio
import os
import sys
import httpx
from dotenv import load_dotenv

# Root is one level up from apps/api
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)

# This will load services.ingestion properly
from services.ingestion.main import IngestionEngine

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

from databases import Database

async def force_ingest():
    db = Database(db_url)
    await db.connect()
    
    # Query Database
    row_wis = await db.fetch_one('SELECT id, "episodeNumber" FROM episodes WHERE "anilistId" = 182300 AND "episodeNumber" = 1.0')
    rows_witch = await db.fetch_all('SELECT id, "episodeNumber" FROM episodes WHERE "anilistId" = 147105 AND "episodeNumber" IN (2.0, 3.0)')
    
    targets = []
    if row_wis:
        targets.append((row_wis['id'], 182300, 1.0, "Tsue to Tsurugi no Wistoria"))
    for r in rows_witch:
        targets.append((r['id'], 147105, float(r['episodeNumber']), "Tongari Boushi no Atelier"))
        
    engine = IngestionEngine()
    
    for ep_id, aid, ep_num, title in targets:
        print(f"\n--- Memproses {aid} Ep {ep_num} ({title}) ---")
        
        # 1. Dapatkan Direct URL dari HF API
        api_url = f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/stream/sources"
        params = {"title": title, "ep": ep_num, "anilist_id": aid}
        
        try:
            res = httpx.get(api_url, params=params, timeout=30)
            data = res.json()
            
            sources = data.get("sources", [])
            provider_id = data.get("provider", "unknown")
            
            if sources:
                direct_url = sources[0].get("url", "")
                print(f"Direct URL found: {direct_url[:50]}...")
                
                if direct_url and "tg-proxy" not in direct_url:
                    print("🚀 Memulai Ingestion Engine lokal...")
                    success = await engine.process_episode(
                        episode_id=ep_id,
                        anilist_id=aid,
                        provider_id=provider_id,
                        episode_number=ep_num,
                        direct_video_url=direct_url
                    )
                    print(f"✅ Ingest Result {aid} Ep {ep_num}: {success}")
                else:
                    print(f"⚠️ Already ingested or invalid URL: {direct_url[:50]}...")
            else:
                print(f"❌ No stream found for {aid} Ep {ep_num}")
                
        except Exception as e:
            print(f"🚨 Error fetch API: {e}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(force_ingest())