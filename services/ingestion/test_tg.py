import os
import requests
import sys

def test_telegram_upload(bot_token: str, chat_id: str):
    print(f"Testing upload to Chat ID: {chat_id}")
    url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
    
    # Membuat file text dummy sementara
    test_file = "test_ingestion_0ms.txt"
    with open(test_file, "w") as f:
        f.write("Hello from Anime Scraper Pro Ingestion Engine! If you see this, Swarm Storage is working.")
        
    try:
        with open(test_file, "rb") as f:
            files = {"document": f}
            data = {"chat_id": chat_id, "caption": "🚀 Test Ingestion Engine"}
            
            response = requests.post(url, data=data, files=files)
            
            if response.status_code == 200:
                print("✅ BERHASIL! File terkirim ke Telegram.")
                resp_json = response.json()
                file_id = resp_json["result"]["document"]["file_id"]
                print(f"📦 File ID Anda: {file_id}")
                print("Langkah selanjutnya: Kita akan menghubungkan File ID ini ke Cloudflare Proxy Worker untuk streaming 0ms.")
            else:
                print(f"❌ GAGAL! HTTP {response.status_code}")
                print(response.text)
    finally:
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Cara penggunaan: python test_tg.py <BOT_TOKEN> <CHAT_ID>")
        sys.exit(1)
        
    token = sys.argv[1]
    chat_id = sys.argv[2]
    test_telegram_upload(token, chat_id)
