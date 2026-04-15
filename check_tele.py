import httpx
import os
import time
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

def check_new_files():
    print(f"🕵️ Memantau kanal Telegram {CHAT_ID}...")
    url = f"https://api.telegram.org/bot{TOKEN}/getUpdates"
    
    try:
        response = httpx.get(url)
        data = response.json()
        if data["ok"]:
            # Kita hanya ingin liat apakah ada message baru di channel
            print(f"✅ Koneksi ke Telegram OK. Menunggu update pesan video...")
            # Note: getUpdates mungkin tidak nangkep message dari bot itu sendiri ke channel
            # Cara terbaik adalah liat riwayat channel atau notifikasi success dari Workflow.
        else:
            print(f"❌ Error: {data.get('description')}")
    except Exception as e:
        print(f"🚨 Error: {e}")

if __name__ == "__main__":
    check_new_files()
