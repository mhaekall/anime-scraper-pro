import httpx
import re
import urllib.parse
from bs4 import BeautifulSoup
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.ssrf_guard import SSRFSafeTransport

BASE_URL = "https://v2.samehadaku.how"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none'
}

class SamehadakuProvider:
    def __init__(self):
        self.client = httpx.AsyncClient(
            transport=SSRFSafeTransport(),
            verify=False,
            headers=HEADERS,
            timeout=15.0,
            follow_redirects=True
        )

    async def get_ongoing(self) -> list:
        """Ambil jadwal rilis (ongoing)"""
        try:
            r = await self.client.get(f"{BASE_URL}/jadwal-rilis/")
            soup = BeautifulSoup(r.text, 'lxml')
            
            results = []
            for li in soup.select('.animepost .animposx'):
                a = li.select_one('a')
                if not a: continue
                img = li.select_one('img')
                title = li.select_one('.title')
                results.append({
                    'title': title.get_text(strip=True) if title else '',
                    'url': a.get('href'),
                    'img': img.get('src') if img else None,
                    'source': 'samehadaku'
                })
            return results
        except Exception as e:
            print(f"[Samehadaku] get_ongoing error: {e}")
            return []

    async def get_anime_list(self) -> list:
        """Ambil daftar semua anime dari daftar-anime-2"""
        try:
            r = await self.client.get(f"{BASE_URL}/daftar-anime-2/")
            soup = BeautifulSoup(r.text, 'lxml')
            
            results = []
            for div in soup.select('.listupd .animepost'):
                a = div.select_one('a')
                if not a: continue
                img = div.select_one('img')
                title = div.select_one('.title')
                results.append({
                    'title': title.get_text(strip=True) if title else '',
                    'url': a.get('href'),
                    'img': img.get('src') if img else None,
                    'source': 'samehadaku'
                })
            return results
        except Exception as e:
            print(f"[Samehadaku] get_anime_list error: {e}")
            return []

    async def get_anime_detail(self, anime_url: str) -> dict:
        """Ambil detail anime + daftar episode"""
        try:
            r = await self.client.get(anime_url)
            soup = BeautifulSoup(r.text, 'lxml')
            
            episodes = []
            for li in soup.select('.lstepi ul li'):
                a = li.select_one('.eps a')
                date_span = li.select_one('.date')
                if a:
                    episodes.append({
                        'title': a.get_text(strip=True),
                        'url': a.get('href'),
                        'date': date_span.get_text(strip=True) if date_span else None
                    })
            
            title = soup.select_one('.infox h1')
            synopsis = soup.select_one('.entry-content')
            
            return {
                'title': title.get_text(strip=True) if title else '',
                'synopsis': synopsis.get_text(strip=True) if synopsis else '',
                'episodes': episodes,
                'source': 'samehadaku'
            }
        except Exception as e:
            print(f"[Samehadaku] get_anime_detail error: {e}")
            return {}

    async def get_episode_sources(self, episode_url: str) -> list:
        """Extract iframe iframe dari halaman episode"""
        try:
            r = await self.client.get(episode_url)
            html = r.text
            soup = BeautifulSoup(html, 'lxml')
            
            sources = []
            for iframe in soup.find_all('iframe'):
                src = iframe.get('src', '')
                if src and 'http' in src:
                    if 'youtube' in src or 'ads' in src: continue
                    sources.append({
                        'resolved': src,
                        'quality': 'Auto',
                        'provider': self._detect_provider(src),
                        'type': 'iframe',
                        'source': 'samehadaku'
                    })
                    
            # Samehadaku specific video extract mechanism (if iframe is not directly exposed)
            # They sometimes put base64 or weird div data in .player-area
            import base64
            
            for div in soup.select('.player-area [data-src]'):
                src = div.get('data-src')
                if src:
                    # Cek apakah src adalah base64 string
                    if not src.startswith('http'):
                        try:
                            # Coba decode base64
                            decoded = base64.b64decode(src).decode('utf-8')
                            # Cari iframe dalam decoded HTML
                            iframe_match = re.search(r'<iframe[^>]+src="([^"]+)"', decoded, re.IGNORECASE)
                            if iframe_match:
                                src = iframe_match.group(1)
                            elif decoded.startswith('http'):
                                src = decoded
                        except Exception:
                            pass
                    
                    if src.startswith('http'):
                        sources.append({
                            'resolved': src,
                            'quality': 'Auto',
                            'provider': self._detect_provider(src),
                            'type': 'iframe',
                            'source': 'samehadaku'
                        })
            
            return sources
        except Exception as e:
            print(f"[Samehadaku] get_episode_sources error: {e}")
            return []

    def _detect_provider(self, url: str) -> str:
        if 'dood' in url: return 'Doodstream'
        if 'streamwish' in url: return 'Streamwish'
        if 'filelions' in url: return 'Filelions'
        if 'mp4upload' in url: return 'Mp4upload'
        return 'Unknown'

    async def close(self):
        await self.client.aclose()
