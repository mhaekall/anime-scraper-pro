import httpx
from utils.ssrf_guard import SSRFSafeTransport
from services.config import HEADERS

client = httpx.AsyncClient(verify=False, headers=HEADERS, timeout=30.0, follow_redirects=True)
scraping_client = httpx.AsyncClient(
    verify=False,
    headers=HEADERS,
    timeout=30.0,
    follow_redirects=False,
    transport=SSRFSafeTransport(),
)
