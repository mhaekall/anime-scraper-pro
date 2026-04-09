from providers.oploverz import OploverzProvider
from providers.otakudesu import OtakudesuProvider
from providers.doronime import DoronimeProvider
from providers.samehadaku import SamehadakuProvider
from utils.extractor import UniversalExtractor
from services.transport import ProviderTransport
from utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpenException

class ProviderCircuitBreakerProxy:
    def __init__(self, provider, name):
        self.provider = provider
        self.name = name
        self.cb = CircuitBreaker(failure_threshold=3, cooldown_seconds=300)
    
    async def get_anime_detail(self, *args, **kwargs):
        try:
            return await self.cb.call(self.provider.get_anime_detail, *args, **kwargs)
        except CircuitBreakerOpenException as e:
            print(f"[{self.name}] {e}")
            return None
        except Exception as e:
            print(f"[{self.name}] Request failed: {e}")
            raise e

    async def get_episode_sources(self, *args, **kwargs):
        try:
            return await self.cb.call(self.provider.get_episode_sources, *args, **kwargs)
        except CircuitBreakerOpenException as e:
            print(f"[{self.name}] {e}")
            return []
        except Exception as e:
            print(f"[{self.name}] Request failed: {e}")
            raise e
            
    # Pass through other attributes (like client for older providers)
    def __getattr__(self, name):
        return getattr(self.provider, name)

shared_transport = ProviderTransport()

oploverz_provider = ProviderCircuitBreakerProxy(OploverzProvider(transport=shared_transport), "oploverz")
otakudesu_provider = ProviderCircuitBreakerProxy(OtakudesuProvider(transport=shared_transport), "otakudesu")
doronime_provider = ProviderCircuitBreakerProxy(DoronimeProvider(transport=shared_transport), "doronime")
samehadaku_provider = ProviderCircuitBreakerProxy(SamehadakuProvider(transport=shared_transport), "samehadaku")
extractor = UniversalExtractor()
