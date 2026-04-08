import httpx
import re
from bs4 import BeautifulSoup
import urllib.parse
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.ssrf_guard import SSRFSafeTransport

BASE_URL = 'https://doronime.id'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
}

class DoronimeProvider:
    def __init__(self):
        self.client = httpx.AsyncClient(
            verify=True,
            headers=HEADERS,
            timeout=30.0,
            follow_redirects=True,
            transport=SSRFSafeTransport(),
        )

    async def search_anime(self, title: str) -> list:
        """Search anime on Doronime via WordPress search query"""
        try:
            search_url = f"{BASE_URL}/?s={urllib.parse.quote_plus(title)}"
            res = await self.client.get(search_url)
            soup = BeautifulSoup(res.text, 'lxml')
            
            results = []
            # Doronime usually uses standard WP search result structure
            for article in soup.select('article.item-list'):
                link_tag = article.select_one('h2.post-box-title a')
                if link_tag:
                    results.append({
                        'title': link_tag.text.strip(),
                        'url': link_tag.get('href')
                    })
            return results
        except Exception as e:
            print(f"[Doronime] Search error: {e}")
            return []

    async def get_latest_updates(self) -> list:
        """Fetch latest releases from homepage"""
        try:
            res = await self.client.get(BASE_URL)
            soup = BeautifulSoup(res.text, 'lxml')
            
            items = []
            # Latest updates usually in a specific container
            for item in soup.select('.latest-post-item'): # This is a common WP class, might need adjustment
                a = item.find('a')
                if a and '/episode/' in a.get('href', ''):
                    items.append({
                        'title': a.get('title') or a.text.strip(),
                        'url': a.get('href'),
                        'source': 'doronime'
                    })
            return items
        except Exception as e:
            print(f"[Doronime] Latest updates error: {e}")
            return []

    async def get_anime_detail(self, anime_url: str) -> dict:
        """
        Placeholder for fetching anime details in Doronime.
        It must return a dict with an 'episodes' list.
        """
        try:
            res = await self.client.get(anime_url)
            soup = BeautifulSoup(res.text, 'lxml')
            episodes = []
            
            # Simple fallback for standard wp episode lists
            # Find links containing 'episode'
            for a in soup.find_all('a', href=True):
                href = a['href']
                if '/episode/' in href and a.text.strip():
                    title = a.text.strip()
                    episodes.append({
                        'title': title,
                        'url': href
                    })
            return {"episodes": episodes}
        except Exception as e:
            print(f"[Doronime] get_anime_detail error: {e}")
            return {"episodes": []}

    async def get_episode_sources(self, episode_url: str) -> dict:
        """Extract Google Drive, Acefile, and Mega links from the episode page"""
        try:
            res = await self.client.get(episode_url)
            soup = BeautifulSoup(res.text, 'lxml')
            
            sources = []
            # Doronime usually has a download table or resolution-based lists
            # Pattern: 1080p [GD | AF | MG]
            
            # 1. Look for download tables
            for table in soup.find_all('table'):
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        quality = cells[0].text.strip().lower()
                        if any(q in quality for q in ['1080', '720', '480', '360']):
                            # Find all links in this row
                            for a in cells[1].find_all('a'):
                                provider_name = a.text.strip().upper()
                                raw_url = a.get('href')
                                
                                if 'google.com' in raw_url or 'drive.' in raw_url:
                                    provider_name = 'GDrive'
                                elif 'acefile' in raw_url:
                                    provider_name = 'Acefile'
                                elif 'mega.nz' in raw_url:
                                    provider_name = 'Mega'
                                    
                                sources.append({
                                    'provider': f"Doronime - {provider_name}",
                                    'quality': self._standardize_quality(quality),
                                    'url': raw_url,
                                    'source': 'doronime',
                                    'type': 'direct' if 'drive' in raw_url or 'acefile' in raw_url else 'iframe'
                                })
            
            # 2. Fallback for non-table structures (list-based)
            if not sources:
                # Some posts use <ul><li> structure
                for li in soup.select('ul li'):
                    text = li.text.lower()
                    if any(q in text for q in ['1080', '720', '480', '360']):
                        for a in li.find_all('a'):
                            sources.append({
                                'provider': f"Doronime - {a.text.strip()}",
                                'quality': self._standardize_quality(text),
                                'url': a.get('href'),
                                'source': 'doronime',
                                'type': 'iframe'
                            })

            return {'sources': sources, 'downloads': sources} # In Doronime, sources ARE downloads
            
        except Exception as e:
            print(f"[Doronime] get_episode_sources error: {e}")
            return {'sources': [], 'downloads': []}

    def _standardize_quality(self, text: str):
        text = text.lower()
        if '1080' in text: return '1080p'
        if '720' in text: return '720p'
        if '480' in text: return '480p'
        if '360' in text: return '360p'
        return 'Auto'

    async def close(self):
        await self.client.aclose()
