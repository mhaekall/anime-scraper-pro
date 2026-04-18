import os
from huggingface_hub import HfApi
from dotenv import load_dotenv

load_dotenv()

# Gunakan Token HF dari GEMINI.md
hf_token = "HF_TOKEN_PLACEHOLDER"
repo_id = "jonyyyyyyyu/anime-scraper-api"
api = HfApi(token=hf_token)

secrets = {
    "DATABASE_URL": os.getenv("DATABASE_URL"),
    "QSTASH_TOKEN": os.getenv("QSTASH_TOKEN"),
    "TELEGRAM_BOT_TOKEN": os.getenv("TELEGRAM_BOT_TOKEN"),
    "TELEGRAM_CHAT_ID": os.getenv("TELEGRAM_CHAT_ID"),
    "TG_PROXY_BASE_URL": os.getenv("TG_PROXY_BASE_URL"),
}

for key, value in secrets.items():
    if value:
        try:
            api.add_space_secret(repo_id=repo_id, key=key, value=value)
            print(f"✅ Secret {key} berhasil ditambahkan ke HF Space.")
        except Exception as e:
            print(f"❌ Gagal menambahkan {key}: {e}")

print("Proses update rahasia selesai. Hugging Face akan merestart Space secara otomatis.")
