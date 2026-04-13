import hmac
import hashlib
import base64
import json
import time
import os
from urllib.parse import quote

import logging

# 32+ char random string
PROXY_SECRET = os.environ.get("PROXY_SECRET")
if not PROXY_SECRET:
    logging.warning("PROXY_SECRET environment variable is not set! Using fallback for development only.")
    PROXY_SECRET = "fallback-only-for-dev"
    
PROXY_BASE   = os.environ.get("PROXY_WORKER_URL", "https://scraper-proxy-swarm.moehamadhkl.workers.dev")
TOKEN_TTL    = 2 * 3600  # 2 jam — lebih aman untuk video streaming

def sign_stream_url(raw_url: str, provider_id: str, quality: str) -> str:
    """
    Encode raw video URL ke signed proxy URL.
    Client hanya melihat proxy URL — raw URL tidak pernah keluar.
    """
    if not PROXY_BASE:
        return raw_url
        
    expires = int(time.time()) + TOKEN_TTL
    
    payload = json.dumps({
        "u": raw_url,           # upstream URL
        "p": provider_id,       # untuk telemetry
        "q": quality,           # quality tag
        "x": expires,           # expiry timestamp
    }, separators=(',', ':'))   # compact JSON
    
    # Base64url encode payload
    b64_payload = base64.urlsafe_b64encode(
        payload.encode()
    ).decode().rstrip('=')
    
    # HMAC-SHA256 signature
    sig = hmac.new(
        PROXY_SECRET.encode(),
        b64_payload.encode(),
        hashlib.sha256
    ).hexdigest()[:16]          # 16 char hex = 64-bit security
    
    return f"{PROXY_BASE.rstrip('/')}/s/{b64_payload}.{sig}"
