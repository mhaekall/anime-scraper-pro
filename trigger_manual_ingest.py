import httpx
import os
import sys
from dotenv import load_dotenv

load_dotenv()

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
QSTASH_URL = os.getenv("QSTASH_URL", "https://qstash.upstash.io").rstrip("/")

def trigger_manual_ingest(ep_id, anilist_id, provider_id, ep_num, direct_url):
    print(f"🚀 Memasukkan perintah INGEST ke QStash untuk Anilist ID: {anilist_id} Ep {ep_num}...")
    
    target_url = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/webhook/ingest"
    
    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json",
        "Upstash-Retries": "5",
    }
    
    payload = {
        "episode_id": ep_id,
        "anilist_id": anilist_id,
        "provider_id": provider_id,
        "episode_number": ep_num,
        "direct_url": direct_url
    }
    
    url = f"{QSTASH_URL}/v2/publish/{target_url}"
    
    try:
        response = httpx.post(url, headers=headers, json=payload)
        if response.status_code >= 200 and response.status_code < 300:
            data = response.json()
            print(f"✅ BERHASIL: Pesan dikirim ke QStash.")
            print(f"📡 Message ID: {data.get('messageId')}")
        else:
            print(f"❌ GAGAL: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    trigger_manual_ingest(16667, 180745, "samehadaku", 5, "https://s0.wibufile.com/video01/CotE-S4-05-FULLHD-SAMEHADAKU.CARE.mp4")
