from services.transport import ProviderTransport
from providers.oploverz.parser import OploverzParser
from providers.base_parser import AnimeDetail, EpisodeSource

BASE = "https://o.oploverz.ltd"

class OploverzProvider:
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = OploverzParser()

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        html = await self._t.get_html(series_url)
        return self._p.parse_episode_list(html, BASE)

    async def get_episode_sources(self, episode_url: str) -> list[EpisodeSource]:
        html = await self._t.get_html(episode_url)
        return self._p.parse_episode_sources(html)