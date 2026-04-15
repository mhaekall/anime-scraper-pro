import asyncio
import os
import sys
import httpx
from dotenv import load_dotenv

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT_DIR)
from services.ingestion.main import IngestionEngine

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

from databases import Database

async def recover_wiped_episodes():
    db = Database(db_url)
    await db.connect()
    
    # 180745 (CotE S4), 147105 (Witch Hat), 182300 (Wistoria)
    targets = [
        (180745, 1.0, "Classroom of the Elite"),
        (180745, 5.0, "Classroom of the Elite"),
        (147105, 1.0, "Witch Hat Atelier"),
        (147105, 2.0, "Witch Hat Atelier"),
        (147105, 3.0, "Witch Hat Atelier"),
        (182300, 1.0, "Wistoria")
    ]
    
    engine = IngestionEngine()
    
    for aid, ep_num, title in targets:
        row = await db.fetch_one('SELECT id FROM episodes WHERE "anilistId" = :aid AND "episodeNumber" = :ep', values={"aid": aid, "ep": float(ep_num)})
        if not row:
            print(f"Skipping {title} Ep {ep_num} (Not in DB)")
            continue
            
        ep_id = row['id']
        print(f"\n--- Mengamankan {title} Ep {ep_num} ---")
        
        api_url = f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/stream/sources"
        params = {"title": title, "ep": ep_num, "anilist_id": aid}
        
        try:
            res = httpx.get(api_url, params=params, timeout=30)
            data = res.json()
            
            sources = data.get("sources", [])
            provider_id = data.get("provider", "unknown")
            
            if sources:
                direct_url = sources[0].get("url", "")
                if direct_url and "tg-proxy" not in direct_url:
                    print(f"URL Mentah Ditemukan: {direct_url[:50]}...")
                    print("🚀 Menjalankan Ingestion untuk mengamankan link proxy...")
                    success = await engine.process_episode(
                        episode_id=ep_id,
                        anilist_id=aid,
                        provider_id=provider_id,
                        episode_number=ep_num,
                        direct_video_url=direct_url
                    )
                    print(f"✅ Ingest Result: {success}")
                else:
                    print(f"⚠️ Sudah aman atau proxy: {direct_url[:50]}...")
            else:
                print(f"❌ Sumber tidak ditemukan dari {provider_id}")
                
        except Exception as e:
            print(f"🚨 Error API: {e}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(recover_wiped_episodes())