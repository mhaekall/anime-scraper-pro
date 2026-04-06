# Q4: Distributed Lock — Production-Grade Implementation

Saran Claude tentang *Distributed Lock* di Redis sangat bagus untuk mencegah konflik antara beberapa instance backend yang berjalan bersamaan.

## Implementation: backend/utils/distributed_lock.py
```python
# backend/utils/distributed_lock.py
import asyncio
import time
import uuid
from typing import Optional
from contextlib import asynccontextmanager

class DistributedLock:
    """
    Redis-based distributed lock menggunakan Upstash REST API.
    """
    
    def __init__(
        self,
        upstash_get_fn,
        upstash_set_fn,
        upstash_del_fn,
        key: str,
        ttl: int = 3500,
        retry_interval: float = 5.0,
        max_wait: float = 60.0,
    ):
        self.get = upstash_get_fn
        self.set = upstash_set_fn
        self.delete = upstash_del_fn
        self.key = f"lock:{key}"
        self.ttl = ttl
        self.retry_interval = retry_interval
        self.max_wait = max_wait
        self._owner_id: Optional[str] = None
    
    async def acquire(self) -> bool:
        owner_id = str(uuid.uuid4())
        start_time = time.time()
        
        while True:
            existing = await self.get(self.key)
            if existing is None:
                # SET NX logic via Upstash
                success = await self.set(
                    self.key,
                    {"owner": owner_id, "acquired_at": time.time()},
                    ex=self.ttl
                )
                if success:
                    self._owner_id = owner_id
                    print(f"[Lock] Acquired '{self.key}'")
                    return True
            else:
                acquired_at = existing.get("acquired_at", 0)
                if time.time() - acquired_at > self.ttl:
                    await self.delete(self.key)
                    continue
            
            elapsed = time.time() - start_time
            if elapsed >= self.max_wait: return False
            
            await asyncio.sleep(self.retry_interval)
    
    async def release(self) -> bool:
        if not self._owner_id: return False
        existing = await self.get(self.key)
        if existing and existing.get("owner") == self._owner_id:
            await self.delete(self.key)
            self._owner_id = None
            return True
        return False
    
    @asynccontextmanager
    async def __aenter__(self):
        acquired = await self.acquire()
        if not acquired:
            raise TimeoutError(f"Could not acquire lock '{self.key}'")
        try:
            yield self
        finally:
            await self.release()
```

## Refactored background_scrape_job (main.py)
```python
# backend/main.py
async def background_scrape_job():
    consecutive_failures = 0
    while True:
        lock = DistributedLock(
            upstash_get_fn=upstash_get,
            upstash_set_fn=upstash_set,
            upstash_del_fn=upstash_delete,
            key="background_scrape"
        )
        try:
            async with lock:
                print("[Cron] Starting scrape job...")
                await _do_scrape_job()
                consecutive_failures = 0 
        except TimeoutError:
            print("[Cron] Another instance is running, skipping")
        except Exception as e:
            consecutive_failures += 1
            backoff = min(60 * (2 ** (consecutive_failures - 1)), 900)
            await asyncio.sleep(backoff)
            continue
        
        await asyncio.sleep(3600)

async def _do_scrape_job():
    # Pindahkan logika inti scraping ke sini
    pass
```
