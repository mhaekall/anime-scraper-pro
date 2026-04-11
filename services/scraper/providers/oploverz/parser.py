import re
from bs4 import BeautifulSoup
from providers.base_parser import BaseParser, AnimeDetail, EpisodeSource

class OploverzParser(BaseParser):
    def parse_episode_list(self, html: str, base_url: str) -> AnimeDetail:
        episodes = []
        seen = set()
        payload_match = re.search(
            r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', html, re.DOTALL
        )
        if payload_match:
            payload = payload_match.group(1)
            matches = re.findall(
                r'slug:"([^"]+)".*?episodeNumber:"([^"]+)"', payload
            )
            for slug, ep_num in matches:
                if ep_num not in seen:
                    seen.add(ep_num)
                    episodes.append({
                        "number": float(ep_num),
                        "title": f"Episode {ep_num}",
                        "url": f"{base_url}/series/{slug}/episode/{ep_num}",
                        "thumbnail": None,
                    })
        return {"episodes": sorted(episodes, key=lambda x: x["number"]),
                "poster": None, "synopsis": ""}

    def parse_episode_sources(self, html: str) -> list[EpisodeSource]:
        sources = []
        payload_match = re.search(
            r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', html, re.DOTALL
        )
        if payload_match:
            ep_match = re.search(
                r'episode:\{.*?streamUrl:(\[.*?\])', payload_match.group(1), re.DOTALL
            )
            if ep_match:
                for src, url in re.findall(
                    r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', ep_match.group(1)
                ):
                    sources.append({"provider": src, "quality": "Auto",
                                    "url": url, "type": "iframe"})
        return sources

    def parse_search_results(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, 'lxml')
        results = []
        for a in soup.select('a.anime-card, .anime-list a'):
            title = a.get('title') or a.text.strip()
            url = a.get('href')
            if url and '/series/' in url:
                results.append({'title': title, 'url': url})
        return results