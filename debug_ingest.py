import asyncio
from httpx import AsyncClient
import os
from dotenv import load_dotenv
load_dotenv("apps/api/.env")

UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN")

async def test():
    import json
    headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
    async with AsyncClient() as client:
        scan_url = f"{UPSTASH_REDIS_REST_URL}/scan/0?MATCH=ingest_progress:*&COUNT=100"
        res = await client.get(scan_url, headers=headers)
        data = res.json()
        print("SCAN DATA:", data)
        if data.get('result'):
            cursor, keys = data['result']
            if keys:
                keys_path = "/".join(keys)
                mget_url = f"{UPSTASH_REDIS_REST_URL}/mget/{keys_path}"
                print("MGET URL:", mget_url)
                mget_res = await client.get(mget_url, headers=headers)
                mget_data = mget_res.json()
                print("MGET DATA:", mget_data)

asyncio.run(test())
