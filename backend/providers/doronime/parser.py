import re
from bs4 import BeautifulSoup
from providers.base_parser import BaseParser, AnimeDetail, EpisodeSource

class DoronimeParser(BaseParser):
    def parse_episode_list(self, html: str, base_url: str) -> AnimeDetail:
        soup = BeautifulSoup(html, 'lxml')
        episodes = []
        
        # Doronime usually lists episodes in <a> tags containing '/episode/'
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/episode/' in href and a.text.strip():
                title = a.text.strip()
                
                # Attempt to extract episode number
                m = re.search(r'(?:episode|eps?)[.\s]*(\d+(?:[.,]\d+)?)', title, re.IGNORECASE)
                ep_num = float(m.group(1).replace(",", ".")) if m else 0.0
                
                episodes.append({
                    'number': ep_num,
                    'title': title,
                    'url': href,
                    'thumbnail': None
                })
        
        # Doronime synopsis is often in a specific div, but varies. Fallback to generic if needed.
        synopsis_div = soup.find('div', class_='sinopsis')
        synopsis = synopsis_div.get_text(strip=True) if synopsis_div else ""
        
        return {
            'episodes': sorted(episodes, key=lambda x: x["number"]),
            'poster': None, # Let AniList handle this mostly
            'synopsis': synopsis
        }

    def parse_episode_sources(self, html: str) -> list[EpisodeSource]:
        soup = BeautifulSoup(html, 'lxml')
        sources = []
        
        # 1. Look for download tables (GDrive, Acefile, Mega)
        for table in soup.find_all('table'):
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 2:
                    quality_text = cells[0].text.strip().lower()
                    if any(q in quality_text for q in ['1080', '720', '480', '360']):
                        quality = self._detect_quality(quality_text)
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
                                'quality': quality,
                                'url': raw_url,
                                'type': 'direct' if 'drive' in raw_url or 'acefile' in raw_url else 'iframe'
                            })
        
        # 2. Fallback for non-table structures (list-based)
        if not sources:
            for li in soup.select('ul li'):
                text = li.text.lower()
                if any(q in text for q in ['1080', '720', '480', '360']):
                    quality = self._detect_quality(text)
                    for a in li.find_all('a'):
                        sources.append({
                            'provider': f"Doronime - {a.text.strip()}",
                            'quality': quality,
                            'url': a.get('href'),
                            'type': 'iframe'
                        })

        return sources

    def parse_search_results(self, html: str) -> list[dict]:
        """Specific hook for Doronime's search results if needed by aggregator"""
        soup = BeautifulSoup(html, 'lxml')
        results = []
        for article in soup.select('article.item-list'):
            link_tag = article.select_one('h2.post-box-title a')
            if link_tag:
                results.append({
                    'title': link_tag.text.strip(),
                    'url': link_tag.get('href')
                })
        return results
        
    def parse_latest_updates(self, html: str) -> list[dict]:
        """Specific hook for fetching latest from homepage"""
        soup = BeautifulSoup(html, 'lxml')
        items = []
        for item in soup.select('.latest-post-item'):
            a = item.find('a')
            if a and '/episode/' in a.get('href', ''):
                items.append({
                    'title': a.get('title') or a.text.strip(),
                    'url': a.get('href'),
                    'source': 'doronime'
                })
        return items

    def _detect_quality(self, text: str) -> str:
        text = text.lower()
        if '1080' in text: return '1080p'
        if '720' in text: return '720p'
        if '480' in text: return '480p'
        if '360' in text: return '360p'
        return 'Auto'