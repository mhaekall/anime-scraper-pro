import asyncio
import os
import sys
from dotenv import load_dotenv
from databases import Database

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

sys.path.append(os.path.join(os.path.dirname(__file__), "apps/api"))

from services.ingestion.main import IngestionEngine

async def force_ingest():
    db = Database(db_url)
    await db.connect()
    
    # Ambil Wistoria S2 (Ep 1)
    row_wis = await db.fetch_one('SELECT id, "episodeNumber", "episodeUrl" FROM episodes WHERE "anilistId" = 182300 AND "episodeNumber" = 1.0')
    # Ambil Witch Hat (Ep 2 & 3)
    rows_witch = await db.fetch_all('SELECT id, "episodeNumber", "episodeUrl" FROM episodes WHERE "anilistId" = 147105 AND "episodeNumber" IN (2.0, 3.0)')
    
    targets = []
    if row_wis:
        targets.append((row_wis['id'], 182300, 1.0))
    for r in rows_witch:
        targets.append((r['id'], 147105, float(r['episodeNumber'])))
        
    engine = IngestionEngine()
    
    for ep_id, aid, ep_num in targets:
        print(f"Mengambil stream untuk {aid} Ep {ep_num}...")
        # Get raw MP4 URL using our backend stream_v2 logic
        from services.stream_cache import _get_all_stream_sources
        
        sources = await _get_all_stream_sources(aid, ep_num)
        if sources:
            direct_url = sources[0].get("url", "")
            provider_id = sources[0].get("source", "unknown")
            print(f"Direct URL found: {direct_url[:50]}...")
            
            if direct_url and "tg-proxy" not in direct_url:
                success = await engine.process_episode(
                    episode_id=ep_id,
                    anilist_id=aid,
                    provider_id=provider_id,
                    episode_number=ep_num,
                    direct_video_url=direct_url
                )
                print(f"Ingest Result {aid} Ep {ep_num}: {success}")
        else:
            print(f"No stream found for {aid} Ep {ep_num}")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(force_ingest())
