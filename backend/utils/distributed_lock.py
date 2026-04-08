import asyncio
import time
import uuid
from typing import Optional
from contextlib import asynccontextmanager

class DistributedLock:
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
            # Try to acquire the lock atomically using SET NX EX
            success = await self.set(
                self.key,
                {"owner": owner_id, "acquired_at": time.time()},
                ex=self.ttl,
                nx=True
            )
            
            if success:
                self._owner_id = owner_id
                print(f"[Lock] Acquired '{self.key}'")
                return True
            
            # If we failed to acquire, check if we've waited too long
            elapsed = time.time() - start_time
            if elapsed >= self.max_wait:
                print(f"[Lock] Timeout waiting for '{self.key}'")
                return False
            
            # Wait before retrying
            await asyncio.sleep(self.retry_interval)
    
    async def release(self) -> bool:
        if not self._owner_id: return False
        existing = await self.get(self.key)
        if existing and existing.get("owner") == self._owner_id:
            await self.delete(self.key)
            self._owner_id = None
            return True
        return False
    
    async def __aenter__(self):
        acquired = await self.acquire()
        if not acquired:
            raise TimeoutError(f"Could not acquire lock '{self.key}'")
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.release()