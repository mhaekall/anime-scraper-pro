from services.transport import ProviderTransport
from providers.base_provider import BaseProvider
from providers.doronime.parser import DoronimeParser
from providers.base_parser import AnimeDetail, EpisodeSource

BASE = "https://doronime.id"

class DoronimeProvider(BaseProvider):
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = DoronimeParser()
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": BASE
        }

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        client = self._t.get_client()
        res = await client.get(series_url, headers=self._headers)
        return self._p.parse_episode_list(res.text, BASE)

    async def get_episode_sources(self, episode_url: str) -> list[EpisodeSource]:
        client = self._t.get_client()
        res = await client.get(episode_url, headers=self._headers)
        return self._p.parse_episode_sources(res.text)

    # Optional hooks that Doronime supported before
    async def search(self, query: str) -> list[dict]:
        import urllib.parse
        client = self._t.get_client()
        search_url = f"{BASE}/?s={urllib.parse.quote_plus(query)}"
        res = await client.get(search_url, headers=self._headers)
        return self._p.parse_search_results(res.text)
        
    async def get_latest_updates(self) -> list[dict]:
        client = self._t.get_client()
        res = await client.get(BASE, headers=self._headers)
        return self._p.parse_latest_updates(res.text)
