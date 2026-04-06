import httpx
import re
import asyncio
from bs4 import BeautifulSoup
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.ssrf_guard import SSRFSafeTransport

# Headers yang mensimulasikan browser mobile Indonesia
# Cloudflare lebih toleran ke mobile UA dibanding desktop bot-like UA
CF_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
}

AJAX_HEADERS = {
    **CF_HEADERS,
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
}

BASE = 'https://otakudesu.cloud'

class OtakudesuProvider:
    def __init__(self):
        # KUNCI: pakai satu client dengan cookie persistence
        # Cloudflare menyimpan cf_clearance cookie setelah challenge
        # Dengan satu client, cookie ini otomatis disimpan dan dikirim ulang
        self.client = httpx.AsyncClient(
            verify=False,
            headers=CF_HEADERS,
            timeout=15.0,
            follow_redirects=True,
            transport=SSRFSafeTransport(),
            # Cookie jar otomatis tersimpan antar request
        )
        self._warmed_up = False

    async def _warmup(self):
        """
        Hit homepage dulu untuk dapat cf_clearance cookie.
        Tanpa ini, request langsung ke episode URL akan kena 403.
        Cukup dilakukan sekali per session.
        """
        if self._warmed_up:
            return
        try:
            await self.client.get(BASE)
            await asyncio.sleep(1)  # Tunggu sebentar, simulasi human
            self._warmed_up = True
        except Exception as e:
            print(f"[Otakudesu] Warmup failed: {e}")

    async def get_ongoing(self) -> list:
        """Ambil daftar anime ongoing"""
        await self._warmup()
        try:
            r = await self.client.get(f"{BASE}/ongoing-anime/")
            soup = BeautifulSoup(r.text, 'lxml')
            
            results = []
            # Otakudesu ongoing list ada di div.venz > ul > li
            for li in soup.select('div.venz ul li'):
                a = li.select_one('h2.jdllist a')
                img = li.select_one('img')
                ep = li.select_one('div.epz')
                day = li.select_one('div.epztipe')
                
                if not a:
                    continue
                    
                results.append({
                    'title': a.get_text(strip=True),
                    'url': a.get('href'),
                    'img': img.get('src') if img else None,
                    'latest_ep': ep.get_text(strip=True) if ep else None,
                    'day': day.get_text(strip=True) if day else None,
                    'source': 'otakudesu'
                })
            return results
        except Exception as e:
            print(f"[Otakudesu] get_ongoing error: {e}")
            return []

    async def get_anime_detail(self, anime_url: str) -> dict:
        """Ambil detail anime + daftar episode"""
        await self._warmup()
        try:
            r = await self.client.get(anime_url)
            soup = BeautifulSoup(r.text, 'lxml')
            
            episodes = []
            # Episode list ada di div.episodelist > ul > li
            for li in soup.select('div.episodelist ul li'):
                a = li.select_one('a')
                span = li.select_one('span.zeroup')
                if a:
                    episodes.append({
                        'title': a.get_text(strip=True),
                        'url': a.get('href'),
                        'date': span.get_text(strip=True) if span else None
                    })
            
            title = soup.select_one('h1.entry-title')
            synopsis = soup.select_one('div.sinopc')
            
            return {
                'title': title.get_text(strip=True) if title else '',
                'synopsis': synopsis.get_text(strip=True) if synopsis else '',
                'episodes': list(reversed(episodes)),  # Oldest first
                'source': 'otakudesu'
            }
        except Exception as e:
            print(f"[Otakudesu] get_anime_detail error: {e}")
            return {}

    async def get_episode_sources(self, episode_url: str) -> list:
        """
        Ini bagian paling kritis — extract video sources dari episode.
        
        Flow Otakudesu:
        1. Fetch halaman episode → dapat HTML dengan nonce tersembunyi
        2. Extract nonce dari script tag  
        3. POST ke wp-admin/admin-ajax.php dengan nonce
        4. Response berisi iframe URLs
        5. Resolve iframe URLs ke direct video links
        """
        await self._warmup()
        
        try:
            # STEP 1: Fetch halaman episode
            r = await self.client.get(
                episode_url,
                headers={**CF_HEADERS, 'Referer': BASE}
            )
            html = r.text
            soup = BeautifulSoup(html, 'lxml')
            
            # STEP 2: Extract nonce
            # Otakudesu menyimpan nonce dalam beberapa tempat:
            
            nonce = None
            post_id = None
            
            # Method A: cari di script tag dengan pattern 'nonce'
            for script in soup.find_all('script'):
                text = script.get_text()
                
                # Pattern 1: var nonce = "xxxxx"
                n = re.search(r'var\s+nonce\s*=\s*["\']([a-f0-9]+)["\']', text)
                if n:
                    nonce = n.group(1)
                
                # Pattern 2: nonce:"xxxxx" dalam object JS
                n2 = re.search(r'nonce["\']?\s*:\s*["\']([a-f0-9]+)["\']', text)
                if n2 and not nonce:
                    nonce = n2.group(1)
                
                # Extract post ID
                p = re.search(r'["\']postid["\']?\s*:\s*["\']?(\d+)', text)
                if p:
                    post_id = p.group(1)
                    
                # Pattern 3: dalam wp_ajax atau localized script
                n3 = re.search(r'"nonce"\s*:\s*"([a-f0-9]+)"', text)
                if n3 and not nonce:
                    nonce = n3.group(1)
            
            # Method B: cari di data attribute HTML
            if not nonce:
                el = soup.select_one('[data-nonce]')
                if el:
                    nonce = el.get('data-nonce')
            
            # Method C: cari post ID dari URL atau meta
            if not post_id:
                canonical = soup.select_one('link[rel="canonical"]')
                if canonical:
                    # Extract dari URL pattern
                    pid = re.search(r'\?p=(\d+)', canonical.get('href', ''))
                    if pid:
                        post_id = pid.group(1)
            
            if not nonce:
                print(f"[Otakudesu] Nonce not found for {episode_url}")
                # Fallback: coba extract iframe langsung dari HTML
                return self._extract_iframes_direct(soup)
            
            # STEP 3: POST ke AJAX endpoint
            # Otakudesu menggunakan action '2a79a4440f' (atau 'aa1208d27f')
            # Ini adalah hashed action name yang kadang berubah
            ajax_actions = ['2a79a4440f', 'aa1208d27f', 'oploverz_get_video']
            
            sources = []
            for action in ajax_actions:
                try:
                    payload = {
                        'action': action,
                        'nonce': nonce,
                    }
                    if post_id:
                        payload['post'] = post_id
                    
                    ajax_r = await self.client.post(
                        f"{BASE}/wp-admin/admin-ajax.php",
                        data=payload,
                        headers={
                            **AJAX_HEADERS,
                            'Referer': episode_url,
                            'Origin': BASE,
                        }
                    )
                    
                    if ajax_r.status_code == 200:
                        data = ajax_r.json()
                        if data:
                            sources = self._parse_ajax_response(data)
                            if sources:
                                break
                except Exception:
                    continue
            
            if not sources:
                # Fallback ke scrape langsung
                sources = self._extract_iframes_direct(soup)
            
            return sources
            
        except Exception as e:
            print(f"[Otakudesu] get_episode_sources error: {e}")
            return []

    def _parse_ajax_response(self, data: dict) -> list:
        """Parse respons AJAX Otakudesu"""
        sources = []
        
        # Response bisa berupa {'mirror': [...]} atau langsung list
        mirrors = data.get('mirror', data.get('data', []))
        if isinstance(mirrors, str):
            # Kadang response-nya HTML string
            soup = BeautifulSoup(mirrors, 'lxml')
            for a in soup.find_all('a'):
                url = a.get('href', '')
                if url and ('http' in url):
                    quality = self._detect_quality(a.get_text())
                    sources.append({
                        'resolved': url, # Need to rename url -> resolved for Player UI
                        'quality': quality,
                        'provider': self._detect_provider(url),
                        'type': 'iframe',
                        'source': 'otakudesu'
                    })
            return sources
            
        for mirror in (mirrors if isinstance(mirrors, list) else []):
            url = mirror.get('url', mirror.get('link', ''))
            if url:
                sources.append({
                    'resolved': url,
                    'quality': self._detect_quality(str(mirror)),
                    'provider': self._detect_provider(url),
                    'type': 'iframe',
                    'source': 'otakudesu'
                })
        
        return sources

    def _extract_iframes_direct(self, soup: BeautifulSoup) -> list:
        """Fallback: extract iframe src langsung dari HTML"""
        sources = []
        for iframe in soup.find_all('iframe'):
            src = iframe.get('src', '')
            if src and 'http' in src:
                # Filter iklan
                if any(ads in src for ads in ['googlesyndication', 'doubleclick', 'ads']):
                    continue
                sources.append({
                    'resolved': src,
                    'quality': 'Auto',
                    'provider': self._detect_provider(src),
                    'type': 'iframe',
                    'source': 'otakudesu'
                })
        return sources

    def _detect_quality(self, text: str) -> str:
        text = text.lower()
        if '1080' in text: return '1080p'
        if '720' in text: return '720p'
        if '480' in text: return '480p'
        if '360' in text: return '360p'
        return 'Auto'

    def _detect_provider(self, url: str) -> str:
        if 'desudrives' in url or 'desustream' in url: return 'DesuDrives'
        if 'mp4upload' in url: return 'Mp4upload'
        if 'streamtape' in url: return 'Streamtape'
        if 'doodstream' in url or 'dood' in url: return 'Doodstream'
        if '4meplayer' in url: return '4mePlayer'
        return 'Unknown'

    async def close(self):
        await self.client.aclose()