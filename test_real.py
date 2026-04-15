import httpx
import os
from dotenv import load_dotenv

# Load kredensial asli dari .env
load_dotenv()

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
HF_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/webhook/sync"

def trigger_real_sync(anilist_id):
    print(f"🚀 Memasukkan perintah SYNC untuk Anilist ID: {anilist_id} ke antrean QStash...")
    
    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json",
        "Upstash-Method": "POST",
    }
    
    payload = {"anilistId": anilist_id}
    
    # QStash API v2: Mengirim pesan ke URL tujuan
    url = f"https://qstash.upstash.io/v2/publish/{HF_URL}"
    
    try:
        response = httpx.post(url, headers=headers, json=payload)
        if response.status_code == 201:
            data = response.json()
            print(f"✅ BERHASIL: Pesan dikirim ke QStash.")
            print(f"📡 Message ID: {data.get('messageId')}")
            print(f"🔗 Anda bisa cek statusnya di: https://console.upstash.com/qstash")
        else:
            print(f"❌ GAGAL: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        anilist_id = int(sys.argv[1])
        trigger_real_sync(anilist_id)
    else:
        print("Penggunaan: python test_real.py <anilist_id>")
