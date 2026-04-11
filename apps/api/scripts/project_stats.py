import asyncio
from db.connection import database

async def main():
    await database.connect()
    
    # 1. Count total unique animes in metadata
    anime_count = await database.fetch_one("SELECT COUNT(*) FROM anime_metadata")
    
    # 2. Count total episodes
    episodes_count = await database.fetch_one("SELECT COUNT(*) FROM episodes")
    
    # 3. Provider distribution in episodes
    provider_stats = await database.fetch_all("""
        SELECT "providerId", COUNT(*) as count 
        FROM episodes 
        GROUP BY "providerId"
    """)
    
    # 4. Count mappings
    mapping_stats = await database.fetch_all("""
        SELECT "providerId", COUNT(*) as count 
        FROM anime_mappings 
        GROUP BY "providerId"
    """)

    print(f"--- Database Stats ---")
    print(f"Total Unique Animes (Metadata): {dict(anime_count)['count']}")
    print(f"Total Episodes in DB: {dict(episodes_count)['count']}")
    
    print(f"\n--- Provider Distribution (Episodes) ---")
    for row in provider_stats:
        print(f"{row['providerId']}: {row['count']} episodes")
        
    print(f"\n--- Provider Distribution (Mappings) ---")
    for row in mapping_stats:
        print(f"{row['providerId']}: {row['count']} titles mapped")

    await database.disconnect()

if __name__ == "__main__":
    asyncio.run(main())