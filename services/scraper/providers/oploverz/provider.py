import urllib.parse
from services.transport import ProviderTransport
from providers.base_provider import BaseProvider
from providers.oploverz.parser import OploverzParser
from providers.base_parser import AnimeDetail, EpisodeSource

BASE = "https://o.oploverz.ltd"

class OploverzProvider(BaseProvider):
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = OploverzParser()

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        html = await self._t.get_html(series_url)
        return self._p.parse_episode_list(html, BASE)

    async def get_episode_sources(self, episode_url: str):
        html = await self._t.get_html(episode_url)
        return self._p.parse_episode_sources(html)

    async def search(self, query: str) -> list[dict]:
        """Search for anime on Oploverz."""
        try:
            url = f"{BASE}/?s={urllib.parse.quote_plus(query)}"
            html = await self._t.get_html(url)
            return self._p.parse_search_results(html)
        except Exception as e:
            print(f"[Oploverz] Search error: {e}")
            return []