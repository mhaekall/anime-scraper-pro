import httpx
import os
import sys
from dotenv import load_dotenv

load_dotenv("apps/api/.env")

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
QSTASH_URL = "https://qstash-eu-central-1.upstash.io"

target_url = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/webhook/ingest"
    
headers = {
    "Authorization": f"Bearer {QSTASH_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "episode_id": 99999,
    "anilist_id": 147105,
    "provider_id": "oploverz",
    "episode_number": 2,
    "direct_url": "dummy"
}

url = f"{QSTASH_URL}/v2/publish/{target_url}"
print(url)
response = httpx.post(url, headers=headers, json=payload)
print(response.status_code, response.text)
