import httpx
import re
import urllib.parse
import time
import random
import string
from utils.ssrf_guard import SSRFSafeTransport

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
}

class UniversalExtractor:
    def __init__(self):
        self.client = httpx.AsyncClient(
            transport=SSRFSafeTransport(),
            verify=False,
            headers=HEADERS,
            timeout=15.0,
            follow_redirects=True
        )

    async def extract_raw_video(self, embed_url: str) -> str:
        url = embed_url
        
        # Handle if the input is actually an iframe HTML string (like what wajik-anime-api generateSrcFromIframeTag does)
        if '<iframe' in url.lower():
            iframe_match = re.search(r'<iframe[^>]+src="([^"]+)"', url, re.IGNORECASE)
            if iframe_match:
                url = iframe_match.group(1)
                
        try:
            if 'kuramadrive' in url or 'kuramanime' in url:
                # wajik-anime-api extracts kuramanime from #player source
                # Try fetching the embed url and getting the source
                res = await self.client.get(url)
                match = re.search(r'<source[^>]+src="([^"]+)"', res.text, re.IGNORECASE)
                if match:
                    return match.group(1)
            elif 'desustream' in url or 'desudrives' in url:
                fetch_url = f"{url}&mode=json" if '?' in url else f"{url}?mode=json"
                res = await self.client.get(fetch_url)
                data = res.json()
                if data.get('ok') and data.get('video'):
                    return await self.extract_raw_video(data['video'].replace('&amp;', '&'))
            elif 'blogger.com' in url:
                res = await self.client.get(url)
                match = re.search(r'"play_url":"([^"]+)"', res.text)
                if match: 
                    return match.group(1).encode('utf-8').decode('unicode_escape')
            elif '4meplayer' in url or 'oplo2.' in url:
                hash_id = url.split('#')[-1]
                if not hash_id: return url
                api_url = f"https://oplo2.4meplayer.pro/api/source/{hash_id}"
                try:
                    res = await self.client.post(api_url, data={'r': '', 'd': 'oplo2.4meplayer.pro'})
                    data = res.json()
                    if data.get('success') and data.get('data'):
                        sources = data['data']
                        for s in sources:
                            if '720' in str(s.get('label', '')):
                                return s.get('file', url)
                        return sources[0].get('file', url) if sources else url
                except Exception:
                    pass
                
                # Fallback: scrape the iframe HTML directly for video sources if API fails
                try:
                    res_html = await self.client.get(url)
                    match = re.search(r'sources:\s*\[\s*{\s*(?:file|src):\s*[\'"]([^\'"]+)[\'"]', res_html.text)
                    if match:
                        return match.group(1)
                    match2 = re.search(r'(?:file|src):\s*[\'"](https?://[^\'"]+\.(?:m3u8|mp4)[^\'"]*)[\'"]', res_html.text)
                    if match2:
                        return match2.group(1)
                except Exception as e:
                    print(f"[Extractor] 4meplayer fallback error: {e}")
                return url
            elif 'streamtape' in url:
                res = await self.client.get(url)
                html = res.text
                token_match = re.search(r"(//streamtape\.com/get_video\?id=[^&'\"]+&expires=[^&'\"]+&ip=[^&'\"]+&token=[^&'\"]+)", html)
                if token_match:
                    return 'https:' + token_match.group(1)
                link_match = re.search(r'get_video\?id=(.+?)&token=(.+?)(?:&|\'|")', html)
                if link_match:
                    return f"https://streamtape.com/get_video?id={link_match.group(1)}&token={link_match.group(2)}&stream=1"
            elif 'mp4upload' in url:
                res = await self.client.get(url)
                html = res.text
                match = re.search(r'"file":"(https?://[^"]+\.mp4[^"]*)"', html)
                if match: return match.group(1).replace('\\/', '/')
                match2 = re.search(r'file:\s*"(https?://[^"]+)"', html)
                if match2: return match2.group(1)
            elif 'dood' in url or 'doodstream' in url:
                res = await self.client.get(url)
                html = res.text
                pass_match = re.search(r'/pass_md5/[^\'\"]+', html)
                if pass_match:
                    base_url = f"https://{urllib.parse.urlparse(url).netloc}"
                    pass_url = base_url + pass_match.group(0)
                    res2 = await self.client.get(pass_url, headers={'Referer': url})
                    token = res2.text
                    rand = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
                    return f"{token}{rand}?token={pass_match.group(0).split('/')[-1]}&expiry={int(time.time())}"
            elif 'filelions' in url or 'streamwish' in url:
                res = await self.client.get(url)
                match = re.search(r'file:\s*["\'](https?://[^"\']+\.(?:m3u8|mp4)[^"\']*)["\']', res.text)
                if match:
                    return match.group(1)
                # handle packed js
                packed_match = re.search(r'eval\(function\(p,a,c,k,e,d\).*?split\(\'\|\'\)\)\)', res.text)
                if packed_match:
                    # Unpack could be complex, for now fallback to looking for m3u8
                    pass
        except Exception as e:
            print(f"[Extractor] Error resolving {url}: {e}")
        
        return url
