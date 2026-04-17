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

    def parse_episode_sources(self, html: str) -> dict:
        sources = []
        downloads = []
        payload_match = re.search(
            r'kit\.start\(app,\s*element,\s*(\{.*?\})\);', html, re.DOTALL
        )
        if payload_match:
            payload = payload_match.group(1)
            
            # Extract streams
            ep_match = re.search(
                r'episode:\{.*?streamUrl:(\[.*?\])', payload, re.DOTALL
            )
            if ep_match:
                for src, url in re.findall(
                    r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', ep_match.group(1)
                ):
                    sources.append({"provider": src, "quality": "Auto",
                                    "url": url, "type": "iframe"})
            
            # Extract Pixeldrain downloads and add them as direct sources
            # Format: quality:"720p",download_links:[{host:"Linkbox",url:"https://pixeldrain.com/u/..."}]
            dl_section = re.finditer(r'quality:"([^"]+)",download_links:\[(.*?)\]', payload)
            for match in dl_section:
                quality = match.group(1)
                links_block = match.group(2)
                for host, url in re.findall(r'host:"([^"]+)",url:"([^"]+)"', links_block):
                    if 'pixeldrain' in url.lower():
                        # Convert to API url to bypass html page
                        if "/u/" in url:
                            file_id = url.split('/u/')[-1].split('?')[0]
                            api_url = f"https://pixeldrain.com/api/file/{file_id}"
                        else:
                            api_url = url
                        sources.append({
                            "provider": "Pixeldrain (Oploverz)",
                            "quality": quality,
                            "url": api_url,
                            "type": "direct"
                        })
                        
        # Support dict return for new architecture while maintaining old list return support in provider
        return {"sources": sources, "downloads": downloads}

    def parse_search_results(self, html: str) -> list[dict]:
        soup = BeautifulSoup(html, 'lxml')
        results = []
        for a in soup.select('a.anime-card, .anime-list a'):
            title = a.get('title') or a.text.strip()
            url = a.get('href')
            if url and '/series/' in url:
                results.append({'title': title, 'url': url})
        return results