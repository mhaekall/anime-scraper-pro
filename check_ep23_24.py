import asyncio
import os
import sys

root_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, root_dir)
sys.path.append(os.path.join(root_dir, 'apps', 'api'))

from databases import Database
from dotenv import load_dotenv

load_dotenv("apps/api/.env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

test_db = Database(db_url)

async def check():
    await test_db.connect()
    from apps.api.services.cache import upstash_get
    
    aid = 101280
    
    odds = [23.0, 24.0]
    found_any = False
    for ep in odds:
        lock = await upstash_get(f"ingest:{aid}:{ep}")
        prog = await upstash_get(f"ingest_progress:{aid}:{ep}")
        
        print(f"\n--- Ep {ep} ---")
        if lock or prog:
            found_any = True
            if lock:
                print(f"Lock: {lock}")
            if prog:
                print(f"Progress: {len(prog.keys())} segments uploaded")
            else:
                print("Progress: None/Empty (Baru mulai memotong/belum ada yg selesai diupload)")
        else:
            print("Belum ada pergerakan (Menunggu QStash / Server sedang tidur)")
                
    await test_db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
