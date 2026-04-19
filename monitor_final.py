import asyncio
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'apps', 'api'))
from services.cache import upstash_get

async def main():
    aid = 101280
    while True:
        print("\033[H\033[J") # Clear screen
        print(f"=== MONITORING TENSURA S1 (IDs: 23, 24) ===")
        
        any_progress = False
        for ep in [23.0, 24.0]:
            lock = await upstash_get(f"ingest:{aid}:{ep}")
            prog = await upstash_get(f"ingest_progress:{aid}:{ep}")
            err = await upstash_get(f"ingest_error:{aid}:{ep}")
            
            print(f"\n--- Episode {ep} ---")
            print(f"Status: {'[ACTIVE]' if lock else '[WAITING/IDLE]'}")
            if lock:
                print(f"Lock Data: {lock}")
            
            if prog:
                any_progress = True
                print(f"Progress: {len(prog.keys())} segments uploaded")
            else:
                print("Progress: 0 segments")
                
            if err:
                print(f"🚨 ERROR: {err}")

        if not lock and any_progress:
            # If lock is gone but progress exists, it might have finished or crashed
            print("\nInfo: Lock is gone. Checking DB for final URL...")
            # We don't check DB in this loop to keep it light
            
        print("\nUpdating in 10s... (Ctrl+C to stop)")
        await asyncio.sleep(10)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nMonitoring stopped.")
