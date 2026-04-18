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
    tasks = []
    async with AsyncClient() as client:
        scan_url = f"{UPSTASH_REDIS_REST_URL}/scan/0?MATCH=ingest_progress:*&COUNT=100"
        res = await client.get(scan_url, headers=headers)
        data = res.json()
        if data.get('result'):
            cursor, keys = data['result']
            if keys:
                keys_path = "/".join(keys)
                mget_url = f"{UPSTASH_REDIS_REST_URL}/mget/{keys_path}"
                mget_res = await client.get(mget_url, headers=headers)
                mget_data = mget_res.json()
                if mget_data.get('result'):
                    values = mget_data['result']
                    for i, key in enumerate(keys):
                        parts = key.split(':')
                        if len(parts) >= 3:
                            val = values[i]
                            status = val
                            if isinstance(val, str) and val.startswith('{'):
                                try:
                                    status = json.loads(val)
                                except:
                                    pass
                            tasks.append({
                                "anilist_id": parts[1],
                                "episode": parts[2],
                                "progress": status
                            })
        print({"success": True, "active_tasks": tasks})

asyncio.run(test())
