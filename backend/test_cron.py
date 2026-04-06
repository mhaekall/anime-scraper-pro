import asyncio
import sys
sys.path.append('/data/data/com.termux/files/home/workspace/anime-scraper-pro/backend')
from main import background_scrape_job

async def test():
    # Run one iteration of background_scrape_job by mocking the while True
    # Actually, background_scrape_job runs an infinite loop. We can just create a task and wait a bit.
    task = asyncio.create_task(background_scrape_job())
    await asyncio.sleep(20)
    task.cancel()
    
if __name__ == "__main__":
    asyncio.run(test())