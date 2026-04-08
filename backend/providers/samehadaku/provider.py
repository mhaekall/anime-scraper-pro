from services.transport import ProviderTransport
from providers.samehadaku.parser import SamehadakuParser
from providers.base_parser import AnimeDetail, EpisodeSource

BASE = "https://v2.samehadaku.how"

class SamehadakuProvider:
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = SamehadakuParser()
        self._headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0",
            "Referer": BASE
        }

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        # Use specialized headers for Samehadaku
        client = self._t.get_client()
        res = await client.get(series_url, headers=self._headers)
        return self._p.parse_episode_list(res.text, BASE)

    async def get_episode_sources(self, episode_url: str) -> list[EpisodeSource]:
        client = self._t.get_client()
        res = await client.get(episode_url, headers=self._headers)
        return self._p.parse_episode_sources(res.text)
