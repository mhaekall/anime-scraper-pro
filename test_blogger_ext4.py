import re

with open('blogger.html', 'r') as f:
    html = f.read()

urls = re.findall(r'https://[^"\',\s]+', html)
for url in urls:
    if 'play' in url.lower() or 'video' in url.lower() or 'mp4' in url.lower():
        print(url)
