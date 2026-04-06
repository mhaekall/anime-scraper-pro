# Q3: SSRF Mitigation yang Dinamis — IP-Based Blocking

Benar sekali — whitelist domain hardcode akan rusak tiap kali video CDN Oploverz ganti domain. Solusi yang benar adalah block by IP range, bukan by domain.

## Implementation: backend/utils/ssrf_guard.py
```python
# backend/utils/ssrf_guard.py
import ipaddress
import socket
from urllib.parse import urlparse
from typing import Optional
import httpx

# RFC-defined private/reserved ranges yang harus selalu diblokir
BLOCKED_RANGES = [
    ipaddress.ip_network("0.0.0.0/8"),          # "This" network
    ipaddress.ip_network("10.0.0.0/8"),          # Private
    ipaddress.ip_network("100.64.0.0/10"),       # Shared address space
    ipaddress.ip_network("127.0.0.0/8"),         # Loopback
    ipaddress.ip_network("169.254.0.0/16"),      # Link-local (AWS metadata!)
    ipaddress.ip_network("172.16.0.0/12"),       # Private
    ipaddress.ip_network("192.0.0.0/24"),        # IETF Protocol
    ipaddress.ip_network("192.168.0.0/16"),      # Private
    ipaddress.ip_network("198.18.0.0/15"),       # Network testing
    ipaddress.ip_network("198.51.100.0/24"),     # Documentation
    ipaddress.ip_network("203.0.113.0/24"),      # Documentation
    ipaddress.ip_network("240.0.0.0/4"),         # Reserved
    ipaddress.ip_network("255.255.255.255/32"),  # Broadcast
    # IPv6
    ipaddress.ip_network("::1/128"),             # Loopback
    ipaddress.ip_network("fc00::/7"),            # Unique local
    ipaddress.ip_network("fe80::/10"),           # Link-local
]

# Domain yang SELALU diblokir, terlepas dari IP resolve-nya
EXPLICITLY_BLOCKED_DOMAINS = {
    "localhost",
    "metadata.google.internal",       # GCP metadata
    "169.254.169.254",                # AWS/Azure metadata
    "100.100.100.200",                # Alibaba metadata
}

# Hanya izinkan HTTP/HTTPS
ALLOWED_SCHEMES = {"http", "https"}

class SSRFError(ValueError):
    """Raised ketika URL dicurigai sebagai SSRF attempt"""
    pass

def is_ip_blocked(ip_str: str) -> bool:
    """Check apakah IP address masuk dalam private/reserved range"""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in BLOCKED_RANGES)
    except ValueError:
        return True  # Invalid IP = block

def resolve_and_validate(url: str) -> str:
    """
    Resolve hostname ke IP dan validasi tidak mengarah ke internal network.
    Return IP yang sudah tervalidasi.
    """
    parsed = urlparse(url)
    
    # Validasi scheme
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise SSRFError(f"Scheme '{parsed.scheme}' tidak diizinkan")
    
    hostname = parsed.hostname
    if not hostname:
        raise SSRFError("URL tidak memiliki hostname")
    
    # Blokir explicit domains
    if hostname.lower() in EXPLICITLY_BLOCKED_DOMAINS:
        raise SSRFError(f"Domain '{hostname}' diblokir secara eksplisit")
    
    # Cek kalau hostname langsung berupa IP address
    try:
        direct_ip = ipaddress.ip_address(hostname)
        if is_ip_blocked(str(direct_ip)):
            raise SSRFError(f"IP address '{hostname}' mengarah ke private/reserved range")
        return str(direct_ip)
    except ValueError:
        pass  # Bukan IP, lanjut ke DNS resolution
    
    # DNS Resolution — ini yang penting untuk prevent DNS rebinding attack
    try:
        # Resolve semua A records
        infos = socket.getaddrinfo(hostname, None)
        for info in infos:
            ip_str = info[4][0]
            if is_ip_blocked(ip_str):
                raise SSRFError(
                    f"Domain '{hostname}' resolve ke private IP '{ip_str}'"
                )
        return infos[0][4][0]  # Return first valid IP
    except socket.gaierror as e:
        raise SSRFError(f"DNS resolution gagal untuk '{hostname}': {e}")

def validate_scrape_url(url: str) -> None:
    """
    Main validation function.
    Raise SSRFError jika URL mencurigakan.
    """
    if not url or not isinstance(url, str):
        raise SSRFError("URL tidak valid")
    
    if len(url) > 2048:
        raise SSRFError("URL terlalu panjang")
    
    parsed = urlparse(url)
    if not parsed.netloc:
        raise SSRFError("URL tidak memiliki netloc")
    
    # Deep validation dengan DNS resolution
    resolve_and_validate(url)
    
    if parsed.username or parsed.password:
        raise SSRFError("URL dengan embedded credentials tidak diizinkan")

# Custom httpx transport dengan SSRF protection
class SSRFSafeTransport(httpx.AsyncHTTPTransport):
    """
    Custom transport yang validate setiap request sebelum dikirim.
    """
    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        try:
            validate_scrape_url(url_str)
        except SSRFError as e:
            raise httpx.HTTPError(f"SSRF protection blocked request: {e}")
        
        return await super().handle_async_request(request)
```

## Integrasi ke main.py
```python
# backend/main.py
from utils.ssrf_guard import validate_scrape_url, SSRFSafeTransport, SSRFError

# Client khusus scraping dengan proteksi SSRF
scraping_client = httpx.AsyncClient(
    verify=False,
    headers=HEADERS,
    timeout=30.0,
    follow_redirects=False,  # JANGAN follow redirect untuk scraping
    transport=SSRFSafeTransport(),  # SSRF protection aktif
)

@app.get('/api/scrape')
async def scrape_episode(url: str = Query(..., description="Episode URL to scrape")):
    try:
        validate_scrape_url(url)
    except SSRFError as e:
        raise HTTPException(status_code=400, detail=f"URL tidak valid: {str(e)}")
    
    # Validasi domain anime yang diizinkan
    parsed = urlparse(url)
    if not any(domain in (parsed.hostname or '') for domain in ['oploverz', 'otakudesu', 'samehadaku']):
        raise HTTPException(
            status_code=400, 
            detail="Hanya URL dari sumber anime yang diizinkan"
        )
    
    # Proceed dengan scraping...
    try:
        r = await scraping_client.get(url)
        # ... rest of logic
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```
