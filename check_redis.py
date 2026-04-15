import os
import httpx
from dotenv import load_dotenv

load_dotenv(".env")
url = os.getenv("UPSTASH_REDIS_REST_URL").strip().strip('"')
token = os.getenv("UPSTASH_REDIS_REST_TOKEN").strip().strip('"')

# Fetch all keys starting with 'ingest'
res = httpx.get(f"{url}/keys/ingest*", headers={"Authorization": f"Bearer {token}"})
print(res.text)
