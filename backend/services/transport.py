import httpx
from utils.ssrf_guard import SSRFSafeTransport

class ProviderTransport:
    """Stateless HTTP transport. Shared across all providers."""
    _client: httpx.AsyncClient | None = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls._client is None or cls._client.is_closed:
            cls._client = httpx.AsyncClient(
                transport=SSRFSafeTransport(),
                verify=False,
                timeout=15.0,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            )
        return cls._client

    async def get_html(self, url: str) -> str:
        r = await self.get_client().get(url)
        r.raise_for_status()
        return r.text