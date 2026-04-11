import urllib.parse
from services.transport import ProviderTransport
from providers.base_provider import BaseProvider
from providers.samehadaku.parser import SamehadakuParser
from providers.base_parser import AnimeDetail, EpisodeSource

BASE = "https://v2.samehadaku.how"

class SamehadakuProvider(BaseProvider):
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
        sources = self._p.parse_episode_sources(res.text)
        
        resolved = []
        for src in sources:
            if src['url'].startswith('ajax://'):
                parts = src['url'].replace('ajax://', '').split('/')
                if len(parts) == 3:
                    post_id, server_num, server_type = parts
                    try:
                        import re
                        ajax_res = await client.post(
                            f"{BASE}/wp-admin/admin-ajax.php",
                            data={
                                'action': 'player_ajax',
                                'post': post_id,
                                'nume': server_num,
                                'type': server_type,
                            },
                            headers={**self._headers, 'X-Requested-With': 'XMLHttpRequest'}
                        )
                        iframe_match = re.search(r'src=["\']([^"\']+)["\']', ajax_res.text)
                        if iframe_match:
                            src['url'] = iframe_match.group(1)
                            resolved.append(src)
                    except Exception as e:
                        print(f"[Samehadaku] AJAX resolve error: {e}")
            else:
                resolved.append(src)
        
        return resolved

    async def search(self, query: str) -> list[dict]:
        """Search for anime on Samehadaku."""
        try:
            url = f"{BASE}/?s={urllib.parse.quote_plus(query)}"
            res = await self._t.get_client().get(url, headers=self._headers)
            return self._p.parse_search_results(res.text)
        except Exception as e:
            print(f"[Samehadaku] Search error: {e}")
            return []
