import os
import httpx
from dotenv import load_dotenv

load_dotenv(".env")

HF_TOKEN = "HF_TOKEN_PLACEHOLDER"
REPO = "jonyyyyyyyu/anime-scraper-api"

secrets = {
    "DATABASE_URL": os.getenv("DATABASE_URL"),
    "QSTASH_TOKEN": os.getenv("QSTASH_TOKEN"),
    "TELEGRAM_BOT_TOKEN": os.getenv("TELEGRAM_BOT_TOKEN"),
    "TELEGRAM_CHAT_ID": os.getenv("TELEGRAM_CHAT_ID"),
    "TG_PROXY_BASE_URL": os.getenv("TG_PROXY_BASE_URL"),
}

headers = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json"
}

for key, val in secrets.items():
    if not val:
        print(f"⚠️ Melewati {key} karena nilainya kosong di .env")
        continue
        
    url = f"https://huggingface.co/api/spaces/{REPO}/secrets"
    print(f"⏳ Menyimpan secret {key}...")
    res = httpx.post(url, headers=headers, json={"key": key, "value": str(val)})
    
    if res.status_code in [200, 201]:
        print(f"✅ Sukses menyimpan {key}")
    else:
        print(f"❌ Gagal menyimpan {key}: {res.status_code} - {res.text}")

print("🔄 Mencoba me-restart Space...")
restart_url = f"https://huggingface.co/api/spaces/{REPO}/restart"
res_restart = httpx.post(restart_url, headers={"Authorization": f"Bearer {HF_TOKEN}"})
if res_restart.status_code in [200, 201]:
    print("✅ Berhasil mengirim perintah restart ke Hugging Face Space.")
else:
    print(f"❌ Gagal me-restart: {res_restart.status_code} - {res_restart.text}")
