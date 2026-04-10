import re
from bs4 import BeautifulSoup
from providers.base_parser import BaseParser, AnimeDetail, EpisodeSource

class KuronimeParser(BaseParser):
    def parse_episode_list(self, html: str, base_url: str) -> AnimeDetail:
        soup = BeautifulSoup(html, "lxml")
        
        title_el = soup.select_one("h1.entry-title")
        title = title_el.text.strip() if title_el else "Unknown Title"
        
        poster_el = soup.select_one(".ts-post-image")
        poster = poster_el.get("src") if poster_el else None
        
        synopsis_el = soup.select_one(".entry-content[itemprop='description']")
        synopsis = synopsis_el.text.strip() if synopsis_el else "No synopsis available."
        
        episodes = []
        for li in soup.select(".eplister ul li"):
            a = li.select_one("a")
            if not a: continue
            ep_url = a.get("href")
            ep_title_el = li.select_one(".epl-title")
            ep_title = ep_title_el.text.strip() if ep_title_el else ""
            ep_num_el = li.select_one(".epl-num")
            
            num_text = ep_num_el.text.strip() if ep_num_el else "0"
            try:
                ep_number = float(re.sub(r'[^0-9.]', '', num_text))
            except:
                ep_number = 0.0
                
            episodes.append({
                "number": ep_number,
                "title": ep_title,
                "url": ep_url,
                "thumbnail": None
            })
            
        return {
            "episodes": episodes,
            "poster": poster,
            "synopsis": synopsis
        }

    def parse_episode_sources(self, html: str) -> list[EpisodeSource]:
        return []
        
    def extract_req_id(self, html: str) -> str | None:
        matches = re.findall(r'var\s+[a-zA-Z0-9_]+\s*=\s*["\']([^"\']{100,})["\']', html)
        if matches:
            return matches[0]
        return None
