import asyncio
import os
from databases import Database
from dotenv import load_dotenv

load_dotenv(".env")
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

async def check():
    db = Database(db_url)
    await db.connect()
    
    print("--- DAFTAR SEMUA EPISODE DENGAN TG-PROXY ---")
    query_tg = """
      SELECT e."anilistId", e."episodeNumber", e."episodeUrl", m."cleanTitle"
      FROM episodes e
      LEFT JOIN anime_metadata m ON e."anilistId" = m."anilistId"
      WHERE e."episodeUrl" LIKE '%tg-proxy%'
      ORDER BY e."updatedAt" DESC
    """
    rows_tg = await db.fetch_all(query_tg)
    for r in rows_tg:
        title = r['cleanTitle'] or "Unknown"
        print(f"✅ {title} (ID: {r['anilistId']}) Ep {r['episodeNumber']} -> {r['episodeUrl'][:50]}...")
        
    print("\n--- STATUS WISTORIA S2 (ID: 182300) ---")
    query_wis = """
      SELECT "episodeNumber", "episodeUrl" FROM episodes WHERE "anilistId" = 182300 ORDER BY "episodeNumber"
    """
    rows_wis = await db.fetch_all(query_wis)
    for r in rows_wis:
        status = "✅ TG-PROXY" if "tg-proxy" in r["episodeUrl"] else "⏳ MENTAH (Samehadaku/dll)"
        print(f"Ep {r['episodeNumber']}: {status} -> {r['episodeUrl'][:50]}...")
        
    print("\n--- STATUS WITCH HAT ATELIER (Pencarian Nama) ---")
    query_witch = """
      SELECT e."anilistId", e."episodeNumber", e."episodeUrl", m."cleanTitle"
      FROM episodes e
      JOIN anime_metadata m ON e."anilistId" = m."anilistId"
      WHERE m."cleanTitle" ILIKE '%Witch Hat%' OR m."nativeTitle" ILIKE '%Witch Hat%'
      ORDER BY e."episodeNumber"
    """
    rows_witch = await db.fetch_all(query_witch)
    if not rows_witch:
        print("Witch Hat Atelier belum ada di database episodes.")
    for r in rows_witch:
        status = "✅ TG-PROXY" if "tg-proxy" in r["episodeUrl"] else "⏳ MENTAH"
        print(f"{r['cleanTitle']} Ep {r['episodeNumber']}: {status} -> {r['episodeUrl'][:50]}...")

    await db.disconnect()

if __name__ == "__main__":
    asyncio.run(check())
