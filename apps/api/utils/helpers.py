import urllib.parse

def extract_domain(url: str):
    try:
        return urllib.parse.urlparse(url).hostname.replace('www.', '')
    except:
        return ""

def determine_quality(text: str):
    text = text.lower()
    if '1080' in text or 'fhd' in text: return '1080p'
    if '720' in text or 'hd' in text: return '720p'
    if '480' in text or 'sd' in text: return '480p'
    if '360' in text: return '360p'
    return 'Auto'
