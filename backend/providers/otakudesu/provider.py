import base64
import json
import re
import urllib.parse
from services.transport import ProviderTransport
from providers.base_provider import BaseProvider
from providers.otakudesu.parser import OtakudesuParser
from providers.base_parser import AnimeDetail, EpisodeSource

BASE = 'https://otakudesu.cloud'

class OtakudesuProvider(BaseProvider):
    def __init__(self, transport: ProviderTransport):
        self._t = transport
        self._p = OtakudesuParser()
        self._warmed_up = False

    async def _warmup(self):
        if self._warmed_up: return
        try:
            await self._t.get_html(BASE)
            self._warmed_up = True
        except:
            pass

    async def get_anime_detail(self, series_url: str) -> AnimeDetail:
        await self._warmup()
        html = await self._t.get_html(series_url)
        return self._p.parse_episode_list(html, BASE)

    async def get_episode_sources(self, episode_url: str) -> list[EpisodeSource]:
        await self._warmup()
        html = await self._t.get_html(episode_url)
        
        credentials = list(dict.fromkeys(re.findall(r'action:"([^"]+)"', html)))
        if len(credentials) < 2:
            return self._p.parse_episode_sources(html)
            
        action_server = credentials[0]
        action_nonce = credentials[1]
        
        client = self._t.get_client()
        headers = {
            'Referer': episode_url, 
            'Origin': BASE, 
            'X-Requested-With': 'XMLHttpRequest', 
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        }
        
        nonce_req = await client.post(
            f"{BASE}/wp-admin/admin-ajax.php",
            data={'action': action_nonce},
            headers=headers
        )
        if nonce_req.status_code != 200:
            return self._p.parse_episode_sources(html)
            
        nonce = nonce_req.json().get('data', '')
        
        sources = []
        mirrors = self._p.extract_mirrors(html)
        for mirror in mirrors:
            try:
                decoded = json.loads(base64.b64decode(mirror['data_content']).decode('utf-8'))
                decoded['nonce'] = nonce
                decoded['action'] = action_server
                
                server_req = await client.post(
                    f"{BASE}/wp-admin/admin-ajax.php",
                    data=decoded,
                    headers=headers
                )
                if server_req.status_code == 200:
                    iframe_html = base64.b64decode(server_req.json().get('data', '')).decode('utf-8')
                    iframe_src = self._p.extract_iframe_src(iframe_html)
                    if iframe_src:
                        sources.append({
                            'provider': mirror['provider'],
                            'quality': mirror['quality'],
                            'url': iframe_src,
                            'type': 'iframe'
                        })
            except Exception:
                continue
                
        if not sources:
            sources = self._p.parse_episode_sources(html)
            
        return sources

    async def search(self, query: str) -> list[dict]:
        """Search for anime on Otakudesu."""
        try:
            await self._warmup()
            url = f"{BASE}/?s={urllib.parse.quote_plus(query)}&post_type=anime"
            html = await self._t.get_html(url)
            return self._p.parse_search_results(html)
        except Exception as e:
            print(f"[Otakudesu] Search error: {e}")
            return []