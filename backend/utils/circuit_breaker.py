import time
import asyncio
from typing import Callable, Any

class CircuitBreakerOpenException(Exception):
    """Exception raised when the circuit breaker is open."""
    pass

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 3, cooldown_seconds: int = 300):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        
        self._failures = 0
        self._open_until = 0.0

    @property
    def is_open(self) -> bool:
        return time.time() < self._open_until

    def record_failure(self):
        self._failures += 1
        if self._failures >= self.failure_threshold:
            self._open_until = time.time() + self.cooldown_seconds
            print(f"[CircuitBreaker] Tripped! Open for {self.cooldown_seconds}s")

    def record_success(self):
        self._failures = 0
        self._open_until = 0.0

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.is_open:
            raise CircuitBreakerOpenException(f"Circuit is OPEN. Try again after {self._open_until - time.time():.1f}s")
            
        try:
            result = await func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise e
