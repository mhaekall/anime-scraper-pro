import httpx
import os
from dotenv import load_dotenv

load_dotenv()

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
# Endpoint Workflow yang baru kita buat
WORKFLOW_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/webhook/ingest-workflow"

def trigger_ingest_workflow(slug, episode):
    print(f"🚀 [WORKFLOW] Memicu Ingestion untuk {slug} Ep {episode}...")
    
    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json",
        "Upstash-Method": "POST",
    }
    
    # Payload yang dibutuhkan oleh workflow kita di webhook.py
    payload = {
        "anime_slug": slug,
        "episode": episode
    }
    
    # QStash v2 Publish
    publish_url = f"https://qstash.upstash.io/v2/publish/{WORKFLOW_URL}"
    
    try:
        response = httpx.post(publish_url, headers=headers, json=payload)
        if response.status_code == 201:
            data = response.json()
            print(f"✅ WORKFLOW DIMULAI!")
            print(f"📡 Message ID: {data.get('messageId')}")
            print(f"🕒 Proses ini memakan waktu (Download + Slice + Upload).")
            print(f"📺 Cek kanal Telegram privat Anda dalam beberapa menit.")
            return data.get('messageId')
        else:
            print(f"❌ GAGAL: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Penggunaan: python trigger_ingest.py <anime_slug> <episode>")
        sys.exit(1)
        
    slug = sys.argv[1]
    ep = int(sys.argv[2])
    msg_id = trigger_ingest_workflow(slug, ep)
