import httpx
import asyncio
import json

UPSTASH_REDIS_REST_URL = "https://close-sunfish-80475.upstash.io"
UPSTASH_REDIS_REST_TOKEN = "gQAAAAAAATpbAAIncDI3MDZlZTliZDk0ODg0ZTZiOGNkNTIzZDZiZGZjNjJhYXAyODA0NzU"

async def test():
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        payload = json.dumps({"test": "data", "array": [1,2,3]})
        # Simulate main.py upstash_set
        res = await client.post(f"{UPSTASH_REDIS_REST_URL}/set/home_data?EX=3600", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}, data=payload)
        print("Set status:", res.status_code)
        print("Set response:", res.text)
        
        res = await client.get(f"{UPSTASH_REDIS_REST_URL}/get/home_data", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"})
        print("Get response:", res.json())

if __name__ == "__main__":
    asyncio.run(test())