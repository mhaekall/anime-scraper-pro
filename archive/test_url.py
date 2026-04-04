import httpx
client = httpx.Client(verify=False, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}, timeout=15.0)
try:
    r = client.get("https://anime.oploverz.ac/series/3d-kanojo-real-girl")
    print(r.status_code)
except Exception as e:
    print(repr(e))
