import httpx
import os
import urllib.parse
from utils.ssrf_guard import SSRFSafeTransport

PROXY_WORKER_URL = os.getenv("PROXY_WORKER_URL") # e.g. https://scraper-proxy-swarm.yourusername.workers.dev
PROXY_SECRET = os.getenv("PROXY_SECRET", "anime-pro-secure-2026")

class ProviderTransport:
    """Stateless HTTP transport. Shared across all providers."""
    _client: httpx.AsyncClient | None = None

    @classmethod
    def get_client(cls) -> httpx.AsyncClient:
        if cls._client is None or cls._client.is_closed:
            cls._client = httpx.AsyncClient(
                transport=SSRFSafeTransport(),
                verify=True,
                timeout=25.0, # Increased timeout for proxy relay
                follow_redirects=True,
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            )
        return cls._client

    async def get_html(self, url: str, use_proxy: bool = True) -> str:
        client = self.get_client()
        
        if use_proxy and PROXY_WORKER_URL:
            # Route through Cloudflare Worker Swarm Proxy
            proxy_url = f"{PROXY_WORKER_URL.rstrip('/')}/?url={urllib.parse.quote(url)}"
            headers = dict(client.headers)
            headers["x-proxy-key"] = PROXY_SECRET
            
            print(f"[SwarmProxy] Routing request to: {url}")
            r = await client.get(proxy_url, headers=headers)
            r.raise_for_status()
            return r.text
        else:
            try:
                from utils.tls_spoof import TLSSpoofTransport
                return await TLSSpoofTransport.get(url)
            except Exception:
                pass
                
            r = await client.get(url)
            
        r.raise_for_status()
        return r.text