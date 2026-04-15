import httpx
import os
import time
from dotenv import load_dotenv

load_dotenv()

QSTASH_TOKEN = os.getenv("QSTASH_TOKEN")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def get_latest_events():
    url = "https://qstash.upstash.io/v2/events"
    headers = {"Authorization": f"Bearer {QSTASH_TOKEN}"}
    try:
        response = httpx.get(url, headers=headers)
        if response.status_code == 200:
            return response.json().get("events", [])
    except Exception as e:
        print(f"🚨 Error: {e}")
    return []

def check_telegram():
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getUpdates"
    try:
        response = httpx.get(url)
        data = response.json()
        if data["ok"] and data["result"]:
            # Cek apakah ada pesan sukses dari bot
            for update in data["result"]:
                msg = update.get("channel_post", {}).get("text", "")
                if "Workflow Success" in msg:
                    return True
    except:
        pass
    return False

def monitor():
    print("🕵️ Memulai Pemantauan Ingestion Engine...")
    start_time = time.time()
    
    while True:
        elapsed = int(time.time() - start_time)
        events = get_latest_events()
        
        # Cari status Ingest dan DB Sync
        ingest_status = "UNKNOWN"
        sync_status = "WAITING"
        
        for event in events:
            url = event.get("url", "")
            state = event.get("state", "")
            
            if "webhook/ingest" in url:
                ingest_status = state
            if "db/sync-episode" in url or "finalize-db" in url:
                sync_status = state

        print(f"🕒 [{elapsed}s] Ingest: {ingest_status} | DB Sync: {sync_status}")

        if sync_status == "DELIVERED":
            print("🎉 VIDEO TERDETEKSI TELAH TERPROSES DAN DISINKRONKAN KE NEON!")
            break
            
        if check_telegram():
            print("🎉 NOTIFIKASI SUKSES DITERIMA DI TELEGRAM!")
            break

        if elapsed > 600: # Timeout 10 menit
            print("⚠️ Pemantauan berakhir (Timeout 10m). Silakan cek Telegram manual.")
            break
            
        time.sleep(30)

if __name__ == "__main__":
    monitor()
