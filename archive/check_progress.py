import os
import httpx
from dotenv import load_dotenv
import json

load_dotenv(".env")
url = os.getenv("UPSTASH_REDIS_REST_URL").strip().strip('"')
token = os.getenv("UPSTASH_REDIS_REST_TOKEN").strip().strip('"')

# Fetch the progress of Tensura Ep 2
res = httpx.get(f"{url}/get/ingest_progress:182205:2.0", headers={"Authorization": f"Bearer {token}"})
data = res.json()
if data.get("result"):
    try:
        progress = json.loads(data["result"])
        print(f"📊 PROGRES TENSURA S4 EP 2: {len(progress)} Segmen Video telah berhasil diunggah ke Telegram!")
    except Exception as e:
        print("Data mentah:", data["result"])
else:
    print("Belum ada progress tercatat atau proses baru dimulai.")
