import os
import json
import logging
from qstash import QStash
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# QSTASH_TOKEN from environment
token = os.getenv("QSTASH_TOKEN")

if not token:
    logger.error("❌ QSTASH_TOKEN is not set in environment variables.")
    logger.error("Please create a free account at https://upstash.com/ to get your QStash Token.")
    logger.error("QStash is required to run the Ingestion Engine in the background for $0.")
else:
    logger.info("✅ QSTASH_TOKEN detected.")
    try:
        client = QStash(token)
        
        # Simulate pushing a background job to our API webhook
        # When running in Hugging Face, the URL will be your actual HF Space URL
        # For local testing, we just use localhost or a mocked URL
        webhook_url = os.getenv("HF_SPACE_URL", "https://your-huggingface-space.hf.space/api/webhook/ingest")
        
        payload = {
            "anilist_id": 180745,
            "episode_number": 1.0
        }
        
        logger.info(f"📤 Mengirimkan Job Ingestion (Anime {payload['anilist_id']} Ep {payload['episode_number']}) ke QStash Queue...")
        
        res = client.message.publish(
            url=webhook_url,
            body=json.dumps(payload),
            headers={"Content-Type": "application/json"}
        )
        
        logger.info(f"✅ Job berhasil masuk antrean QStash! Message ID: {res.message_id}")
        logger.info("QStash sekarang akan memanggil webhook server backend Anda secara otomatis di latar belakang.")
        
    except Exception as e:
        logger.error(f"❌ Gagal mengirim pesan ke QStash: {e}")
