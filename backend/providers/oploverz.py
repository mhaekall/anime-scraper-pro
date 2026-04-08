import httpx
import re
from bs4 import BeautifulSoup
import urllib.parse
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.ssrf_guard import SSRFSafeTransport

BASE_URL = 'https://o.oploverz.ltd'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1'
}

class OploverzProvider:
    def __init__(self):
        self.client = httpx.AsyncClient(
            verify=False,
            headers=HEADERS,
            timeout=30.0,
            follow_redirects=False,
            transport=SSRFSafeTransport(),
        )

    async def get_anime_detail(self, series_url: str) -> dict:
        try:
            r = await self.client.get(series_url, follow_redirects=True)
            soup = BeautifulSoup(r.text, 'lxml')
            
            poster_meta = soup.find('meta', property="og:image")
            poster = poster_meta.get('content') if poster_meta else None
            
            desc_meta = soup.find('meta', property="og:description")
            desc = desc_meta.get('content') if desc_meta else ""
            
            episodes = []
            seen = set()
            
            # Method 1: SvelteKit payload
            payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', r.text, re.DOTALL)
            if payload_match:
                payload = payload_match.group(1)
                
                # Try slug first, then episodeNumber
                matches = re.findall(r'slug:"([^"]+)".*?episodeNumber:"([^"]+)"', payload)
                if not matches:
                    # Try episodeNumber first, then slug
                    matches_rev = re.findall(r'episodeNumber:"([^"]+)".*?slug:"([^"]+)"', payload)
                    matches = [(s, e) for e, s in matches_rev]
                
                for slug, ep_num in matches:
                    if ep_num not in seen:
                        seen.add(ep_num)
                        # Construct exact URL using the slug from the payload
                        full_url = f"{BASE_URL}/series/{slug}/episode/{ep_num}"
                        try:
                            parsed_num = float(ep_num)
                        except ValueError:
                            parsed_num = 0.0
                        episodes.append({
                            'title': f'Episode {ep_num}', 
                            'url': full_url,
                            'number': parsed_num
                        })
            
            # Method 2: Anchor tags (SvelteKit SSR)
            if not episodes:
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if '/episode/' in href:
                        ep_match = re.search(r'/episode/([\d\.]+)', href)
                        if ep_match:
                            ep_num = ep_match.group(1)
                            if ep_num not in seen:
                                seen.add(ep_num)
                                # make absolute
                                if href.startswith('/'):
                                    full_url = f"{BASE_URL}{href}"
                                else:
                                    full_url = href
                                try:
                                    parsed_num = float(ep_num)
                                except ValueError:
                                    parsed_num = 0.0
                                episodes.append({
                                    'title': f'Episode {ep_num}', 
                                    'url': full_url,
                                    'number': parsed_num
                                })
            
            episodes.sort(key=lambda x: x['number'], reverse=True)
                
            return {
                'poster': poster,
                'synopsis': desc,
                'episodes': episodes
            }
        except Exception as e:
            print(f"[Oploverz] get_anime_detail error: {e}")
            return {"episodes": []}

    async def get_episode_sources(self, episode_url: str) -> dict:
        try:
            r = await self.client.get(episode_url)
            if r.status_code in (301, 302, 303, 307, 308):
                next_url = r.headers.get('location')
                if next_url:
                    if not next_url.startswith('http'):
                        next_url = urllib.parse.urljoin(episode_url, next_url)
                    r = await self.client.get(next_url)
            
            html = r.text
            
            raw_embeds = []
            seen = set()

            downloads = []
            payload_match = re.search(r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', html, re.DOTALL)
            if payload_match:
                payload = payload_match.group(1)
                
                # Isolate the current episode's object to prevent grabbing other episodes' streams
                ep_match = re.search(r'episode:\{(.*?)streamUrl:(\[.*?\])', payload, re.DOTALL)
                if ep_match:
                    ep_data = ep_match.group(1)
                    streams_str = ep_match.group(2)
                    stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', streams_str)
                    
                    down_match = re.search(r'downloadUrl:\s*(\[.*?\]),streamUrl:', payload, re.DOTALL)
                    if down_match:
                        down_str = down_match.group(1)
                        fmt_blocks = re.finditer(r'format:\"([^\"]+)\",resolutions:\[(.*?)\]\}\]', down_str, re.DOTALL)
                        for fmt in fmt_blocks:
                            f_type = fmt.group(1)
                            res_str = fmt.group(2)
                            quals = re.finditer(r'quality:\"([^\"]+)\",download_links:\[(.*?)\]\}', res_str, re.DOTALL)
                            
                            for q in quals:
                                q_type = q.group(1)
                                links_str = q.group(2)
                                links = []
                                for link in re.finditer(r'host:\"([^\"]+)\",url:\"([^\"]+)\"', links_str):
                                    links.append({'host': link.group(1), 'url': link.group(2)})
                                
                                downloads.append({'format': f_type, 'quality': q_type, 'links': links})
                else:
                    stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', payload)
            else:
                stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', html)
            
            bad_keywords = ['youtube', 'facebook', 'twitter', 'instagram', 't.me', 'ads', 'banner', 'histats', 'google', 'wp-admin', 'cutt.ly', 't2m.io', 'vtxlinks', 'ombak', 'togel', 'slot', 'gcbos', 'guguk', 'joiboy', 'tapme', 'infodomain', 'tempatsucii']

            for source_name, source_url in stream_matches:
                if any(kw in source_url.lower() for kw in bad_keywords): continue
                
                domain = self._extract_domain(source_url)
                quality = self._determine_quality(source_name + " " + source_url)
                
                dup_key = f"{domain}-{quality}"
                if source_url not in seen and dup_key not in seen:
                    seen.add(source_url)
                    seen.add(dup_key)
                    raw_embeds.append({
                        'provider': source_name,
                        'domain': domain,
                        'quality': quality,
                        'url': source_url,
                        'source': 'oploverz'
                    })

            return {'sources': raw_embeds, 'downloads': downloads}

        except Exception as e:
            print(f"[Oploverz] get_episode_sources error: {e}")
            return {'sources': [], 'downloads': []}

    def _extract_domain(self, url: str):
        try:
            return urllib.parse.urlparse(url).hostname.replace('www.', '')
        except:
            return ""

    def _determine_quality(self, text: str):
        text = text.lower()
        if '1080' in text or 'fhd' in text: return '1080p'
        if '720' in text or 'hd' in text: return '720p'
        if '480' in text or 'sd' in text: return '480p'
        if '360' in text: return '360p'
        return 'Auto'

    async def close(self):
        await self.client.aclose()