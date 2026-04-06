import httpx
import asyncio
import json

UPSTASH_REDIS_REST_URL = "https://close-sunfish-80475.upstash.io"
UPSTASH_REDIS_REST_TOKEN = "gQAAAAAAATpbAAIncDI3MDZlZTliZDk0ODg0ZTZiOGNkNTIzZDZiZGZjNjJhYXAyODA0NzU"

async def test():
    async with httpx.AsyncClient() as client:
        payload = json.dumps({"msg": "hello"})
        res = await client.post(f"{UPSTASH_REDIS_REST_URL}/set/test_key?EX=60", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}, data=payload)
        print("Set:", res.json())
        
        res = await client.get(f"{UPSTASH_REDIS_REST_URL}/get/test_key", headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"})
        print("Get:", res.json())

if __name__ == "__main__":
    asyncio.run(test())