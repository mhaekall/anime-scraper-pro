import time
import asyncio
from typing import Callable, Any
from services.cache import upstash_get, upstash_set

class CircuitBreakerOpenException(Exception):
    """Exception raised when the circuit breaker is open."""
    pass

class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int = 3, cooldown_seconds: int = 300):
        self.name = name
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds

    async def is_open(self) -> bool:
        state = await upstash_get(f"cb:{self.name}:open")
        return bool(state)

    async def get_failures(self) -> int:
        fails = await upstash_get(f"cb:{self.name}:fails")
        return int(fails) if fails else 0

    async def record_failure(self):
        fails = await self.get_failures()
        fails += 1
        await upstash_set(f"cb:{self.name}:fails", fails, ex=self.cooldown_seconds)
        if fails >= self.failure_threshold:
            await upstash_set(f"cb:{self.name}:open", 1, ex=self.cooldown_seconds)
            print(f"[CircuitBreaker] Tripped! Open for {self.cooldown_seconds}s for {self.name}")

    async def record_success(self):
        await upstash_set(f"cb:{self.name}:fails", 0, ex=self.cooldown_seconds)

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if await self.is_open():
            raise CircuitBreakerOpenException(f"Circuit is OPEN for {self.name}.")
            
        try:
            result = await func(*args, **kwargs)
            await self.record_success()
            return result
        except Exception as e:
            await self.record_failure()
            raise e
