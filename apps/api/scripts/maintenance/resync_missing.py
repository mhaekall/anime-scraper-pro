import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import database
from services.pipeline import sync_anime_episodes

async def resync_missing_episodes():
    print("🚀 Looking for mapped anime with 0 episodes...")

    rows = await database.fetch_all("""
        SELECT m."anilistId", m."cleanTitle" 
        FROM anime_metadata m
        JOIN anime_mappings map ON m."anilistId" = map."anilistId"
        LEFT JOIN episodes e ON m."anilistId" = e."anilistId"
        GROUP BY m."anilistId", m."cleanTitle"
        HAVING COUNT(e.id) = 0
    """)
    
    if not rows:
        print("✅ No missing episodes found for mapped anime.")
        return

    print(f"Found {len(rows)} anime mapped but without episodes. Syncing now...")

    for r in rows:
        aid = r["anilistId"]
        title = r["cleanTitle"]
        print(f"\nSyncing episodes for: {title} (ID: {aid})")
        try:
            res = await sync_anime_episodes(aid)
            print(f"  -> Result: {res}")
        except Exception as e:
            print(f"  -> Error: {e}")

    print("\n✅ Resync Finished.")

async def main():
    await database.connect()
    await resync_missing_episodes()
    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
