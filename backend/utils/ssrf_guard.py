import ipaddress
import socket
from urllib.parse import urlparse
import httpx

# RFC-defined private/reserved ranges
BLOCKED_RANGES = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("100.64.0.0/10"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.0.0.0/24"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("198.18.0.0/15"),
    ipaddress.ip_network("198.51.100.0/24"),
    ipaddress.ip_network("203.0.113.0/24"),
    ipaddress.ip_network("240.0.0.0/4"),
    ipaddress.ip_network("255.255.255.255/32"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

EXPLICITLY_BLOCKED_DOMAINS = {
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",
    "100.100.100.200",
}

ALLOWED_SCHEMES = {"http", "https"}

class SSRFError(ValueError):
    pass

def is_ip_blocked(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in network for network in BLOCKED_RANGES)
    except ValueError:
        return True

def resolve_and_validate(url: str) -> str:
    parsed = urlparse(url)
    
    if parsed.scheme not in ALLOWED_SCHEMES:
        raise SSRFError(f"Scheme '{parsed.scheme}' not allowed")
    
    hostname = parsed.hostname
    if not hostname:
        raise SSRFError("URL missing hostname")
    
    if hostname.lower() in EXPLICITLY_BLOCKED_DOMAINS:
        raise SSRFError(f"Domain '{hostname}' explicitly blocked")
    
    try:
        direct_ip = ipaddress.ip_address(hostname)
        if is_ip_blocked(str(direct_ip)):
            raise SSRFError(f"IP '{hostname}' points to reserved range")
        return str(direct_ip)
    except ValueError:
        pass
    
    try:
        infos = socket.getaddrinfo(hostname, None)
        for info in infos:
            ip_str = info[4][0]
            if is_ip_blocked(ip_str):
                raise SSRFError(f"Domain '{hostname}' resolves to private IP '{ip_str}'")
        return infos[0][4][0]
    except socket.gaierror as e:
        raise SSRFError(f"DNS resolution failed for '{hostname}': {e}")

def validate_scrape_url(url: str) -> None:
    if not url or not isinstance(url, str):
        raise SSRFError("Invalid URL")
    
    if len(url) > 2048:
        raise SSRFError("URL too long")
    
    parsed = urlparse(url)
    if not parsed.netloc:
        raise SSRFError("URL missing netloc")
    
    resolve_and_validate(url)
    
    if parsed.username or parsed.password:
        raise SSRFError("URL with embedded credentials not allowed")

class SSRFSafeTransport(httpx.AsyncHTTPTransport):
    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        # print(f"[SSRF DEBUG] Validating: {url_str}")
        try:
            validate_scrape_url(url_str)
        except SSRFError as e:
            print(f"[SSRF ERROR] blocked '{url_str}': {e}")
            raise httpx.HTTPError(f"SSRF protection blocked request: {e}")
        
        return await super().handle_async_request(request)