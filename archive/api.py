import re
import urllib.parse
from flask import Flask, request, jsonify
from flask_cors import CORS
import httpx
from bs4 import BeautifulSoup
import traceback

app = Flask(__name__)
CORS(app)

BASE_URL = 'https://o.oploverz.ltd'
HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# httpx Client ignoring SSL errors (similar to NODE_TLS_REJECT_UNAUTHORIZED=0)
client = httpx.Client(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)

def extract_domain(url):
    try:
        return urllib.parse.urlparse(url).hostname.replace('www.', '')
    except:
        return ""

def determine_quality(text):
    text = text.lower()
    if '1080' in text or 'fhd' in text: return '1080p'
    if '720' in text or 'hd' in text: return '720p'
    if '480' in text or 'sd' in text: return '480p'
    if '360' in text: return '360p'
    return 'Auto'

@app.route('/api/series', methods=['GET'])
def get_series():
    try:
        url = 'https://o.oploverz.ltd/series'
        r = client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        series = []
        seen = set()

        for a in soup.select('a[href^="/series/"]'):
            href = a.get('href')
            title = a.get_text(strip=True)
            if href and len(href) > 8 and title and href not in seen:
                seen.add(href)
                full_url = href if href.startswith('http') else BASE_URL + href
                series.append({'title': title, 'url': full_url})

        return jsonify({'success': True, 'data': series})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/home', methods=['GET'])
def get_home():
    try:
        url = 'https://o.oploverz.ltd/'
        r = client.get(url)
        soup = BeautifulSoup(r.text, 'lxml')
        items = []
        seen = set()

        for a in soup.select('a[href*="/episode/"]'):
            img_tag = a.find('img')
            img = img_tag.get('src') if img_tag else None
            
            title = img_tag.get('alt') or a.get('title') if img_tag else None
            if title and title.startswith('cover-'):
                title = title.replace('cover-', '').replace('-', ' ').title()
            
            if not title or not title.strip():
                parts = a.get('href').split('/')
                if len(parts) > 2:
                    title = parts[2].replace('-', ' ').title()
            
            if img and 'poster' in img:
                href = a.get('href')
                series_url_part = href.split('/episode/')[0]
                
                if title and title not in seen:
                    seen.add(title)
                    series_url = series_url_part if series_url_part.startswith('http') else BASE_URL + series_url_part
                    ep_url = href if href.startswith('http') else BASE_URL + href
                    items.append({'title': title, 'url': series_url, 'episodeUrl': ep_url, 'img': img})
        
        return jsonify({'success': True, 'data': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/episodes', methods=['GET'])
def get_episodes():
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({'error': 'URL is required'}), 400
    try:
        r = client.get(target_url)
        soup = BeautifulSoup(r.text, 'lxml')
        episodes = []
        seen = set()

        for a in soup.select('a[href*="/episode/"]'):
            href = a.get('href')
            # Clean up svelte comments
            title = a.get_text(strip=True).replace('<!--[!-->', '').replace('<!--]-->', '').replace('<!---->', '').strip()
            if href and title and href not in seen:
                seen.add(href)
                full_url = href if href.startswith('http') else BASE_URL + href
                episodes.append({'title': title, 'url': full_url})

        return jsonify({'success': True, 'data': episodes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scrape', methods=['GET'])
def scrape_episode():
    target_url = request.args.get('url')
    if not target_url:
        return jsonify({'error': 'URL is required'}), 400
    try:
        r = client.get(target_url)
        html = r.text
        soup = BeautifulSoup(html, 'lxml')
        embeds = []
        seen = set()
        
        title_tag = soup.find('title')
        anime_title = title_tag.text if title_tag else 'Unknown Title'

        bad_keywords = ['youtube', 'facebook', 'twitter', 'instagram', 't.me', 'ads', 'banner', 'histats', 'google', 'wp-admin', 'cutt.ly', 't2m.io', 'vtxlinks', 'ombak', 'togel', 'slot', 'gcbos', 'guguk', 'joiboy', 'tapme', 'infodomain', 'tempatsucii']

        def add_embed(url, provider_text):
            if not url or type(url) != str: return
            
            if url.startswith('//'): url = 'https:' + url
            if not url.startswith('http'): return
            
            if any(kw in url.lower() for kw in bad_keywords): return
            
            domain = extract_domain(url)
            if 'Data' in provider_text or 'Option' in provider_text or 'Found' in provider_text:
                provider_text = domain.split('.')[0].upper()
            
            quality = determine_quality(provider_text + " " + url)
            
            # Deduplicate by exact URL or domain+quality combination
            dup_key = f"{domain}-{quality}"
            if url not in seen and dup_key not in seen:
                seen.add(url)
                seen.add(dup_key)
                embeds.append({
                    'provider': provider_text,
                    'domain': domain,
                    'quality': quality,
                    'resolved': url,
                    'type': 'iframe'
                })

        # Find typical external links
        for a in soup.find_all('a', href=True, target='_blank'):
            href = a.get('href')
            if a.find('img'): continue # Skip image banners
            
            text = a.get_text(strip=True)
            if len(text) < 2 and a.parent:
                text = a.parent.get_text(strip=True)
            
            row = a.find_parent('div', class_='flex-row')
            if row:
                row_text = row.get_text(strip=True).lower()
                if '1080' in row_text: text += ' 1080p'
                elif '720' in row_text: text += ' 720p'
                elif '480' in row_text: text += ' 480p'
                elif '360' in row_text: text += ' 360p'
                elif not text: text = row_text
                
            add_embed(href, text or 'External Download')

        # Svelte Payload Streaming Links Extraction
        stream_matches = re.findall(r'\{source:"([^"]+)",url:"(https?://[^"]+)"\}', html)
        for source_name, url in stream_matches:
            add_embed(url, source_name)

        # Sorting logic (1080p -> 720p -> 480p -> 360p -> Auto)
        rank = {"1080p": 5, "720p": 4, "480p": 3, "360p": 2, "Auto": 1}
        embeds.sort(key=lambda x: rank.get(x['quality'], 1), reverse=True)

        return jsonify({'success': True, 'anime': {'title': anime_title}, 'sources': embeds})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
