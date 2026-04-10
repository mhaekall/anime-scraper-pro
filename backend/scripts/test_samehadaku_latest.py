import asyncio
import os
import sys
import re

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.providers import samehadaku_provider, extractor
from utils.helpers import extract_domain, determine_quality

async def _resolve_embed(embed: dict, source_tag: str) -> dict | None:
    url = embed.get('url') or embed.get('resolved', '')
    if not url: return None
    try:
        async with asyncio.timeout(7.0):
            resolved = await extractor.extract_raw_video(url)
        return {
            'provider':  embed.get('provider', source_tag),
            'domain':    extract_domain(resolved),
            'quality':   determine_quality(embed.get('quality', 'Auto')),
            'url':       resolved,
            'embed_url': url,
            'type':      'direct' if resolved.endswith(('.m3u8', '.mp4')) else 'iframe',
            'source':    source_tag,
        }
    except: return None

async def _scrape_samehadaku(title: str, episode_num: float) -> dict:
    try:
        async with asyncio.timeout(15.0):
            s = await samehadaku_provider.search(title)
            if not s: return {'sources': [], 'provider': 'samehadaku'}
            details = await samehadaku_provider.get_anime_detail(s[0]['url'])
            if not details: return {'sources': [], 'provider': 'samehadaku'}
            target_url = next((e['url'] for e in details.get('episodes', []) if re.search(fr'\b{episode_num}\b', e['title'])), None)
            if not target_url: return {'sources': [], 'provider': 'samehadaku'}
            raw = await samehadaku_provider.get_episode_sources(target_url)
            embeds = raw if isinstance(raw, list) else raw.get('sources', [])
            resolved = await asyncio.gather(*[_resolve_embed(e, 'samehadaku') for e in embeds])
            return {'sources': [s for s in resolved if s], 'provider': 'samehadaku'}
    except Exception as e:
        print(f"Error: {e}")
        return {'sources': [], 'provider': 'samehadaku'}

async def test_latest_real_anime():
    print("Testing real latest anime on Samehadaku...")
    # Searching for a popular ongoing/recent anime
    anime_title = "Solo Leveling"
    ep = 11
    
    print(f"Executing _scrape_samehadaku for '{anime_title}' Ep {ep}...")
    res = await _scrape_samehadaku(anime_title, ep)
    
    sources = res.get('sources', [])
    print(f"Total sources found: {len(sources)}")
    
    direct_links = [s for s in sources if s and s.get('type') == 'direct']
    iframe_links = [s for s in sources if s and s.get('type') == 'iframe']
    
    print(f"\n--- DIRECT LINKS ({len(direct_links)}) ---")
    for d in direct_links:
        print(f"[{d['quality']}] {d['url']}")
        
    print(f"\n--- IFRAME LINKS ({len(iframe_links)}) ---")
    
if __name__ == "__main__":
    asyncio.run(test_latest_real_anime())
