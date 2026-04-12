import os
import httpx
from services.config import QSTASH_TOKEN

class QStashPublisher:
    """Lightweight QStash REST publisher."""
    
    @staticmethod
    async def publish_sync_task(anilist_id: int):
        if not QSTASH_TOKEN:
            print(f"[QStash] Token missing, cannot queue sync for {anilist_id}")
            return
            
        # Target webhook URL is dynamic based on environment.
        # In production, it's the HuggingFace URL or custom domain.
        target_url = os.getenv("API_PUBLIC_URL", "https://jonyyyyyyyu-anime-scraper-api.hf.space")
        target_url = f"{target_url.rstrip('/')}/api/v2/webhook/sync"
        qstash_url = os.getenv("QSTASH_URL", "https://qstash.upstash.io").rstrip("/")
        
        async with httpx.AsyncClient(verify=False) as client:
            try:
                res = await client.post(
                    f"{qstash_url}/v2/publish/" + target_url,
                    headers={
                        "Authorization": f"Bearer {QSTASH_TOKEN}",
                        "Content-Type": "application/json",
                        "Upstash-Retries": "2",  # Retry twice on failure
                        "Upstash-Timeout": "10m" # Heavy syncs might take long, but HF Space has its own limits
                    },
                    json={"anilistId": anilist_id}
                )
                if res.status_code >= 400:
                    print(f"[QStash] Publish Failed: {res.status_code} - {res.text}")
                else:
                    print(f"[QStash] Queued sync for anilistId={anilist_id} successfully.")
            except Exception as e:
                print(f"[QStash] Exception publishing to QStash: {e}")

    @staticmethod
    async def publish_ingest_task(episode_id: int, anilist_id: int, provider_id: str, episode_number: float, direct_url: str):
        if not QSTASH_TOKEN:
            print(f"[QStash] Token missing, cannot queue ingest for Ep {episode_number}")
            return
            
        target_url = os.getenv("API_PUBLIC_URL", "https://jonyyyyyyyu-anime-scraper-api.hf.space")
        target_url = f"{target_url.rstrip('/')}/api/v2/webhook/ingest"
        qstash_url = os.getenv("QSTASH_URL", "https://qstash.upstash.io").rstrip("/")
        
        async with httpx.AsyncClient(verify=False) as client:
            try:
                res = await client.post(
                    f"{qstash_url}/v2/publish/" + target_url,
                    headers={
                        "Authorization": f"Bearer {QSTASH_TOKEN}",
                        "Content-Type": "application/json",
                        "Upstash-Retries": "1", 
                        "Upstash-Timeout": "10m" # Ingestion takes time
                    },
                    json={
                        "episode_id": episode_id,
                        "anilist_id": anilist_id,
                        "provider_id": provider_id,
                        "episode_number": episode_number,
                        "direct_url": direct_url
                    }
                )
                if res.status_code >= 400:
                    print(f"[QStash] Ingest Publish Failed: {res.status_code} - {res.text}")
                else:
                    print(f"[QStash] Queued Ingestion for Ep {episode_number} successfully.")
            except Exception as e:
                print(f"[QStash] Exception publishing ingest to QStash: {e}")

enqueue_sync = QStashPublisher.publish_sync_task
enqueue_ingest = QStashPublisher.publish_ingest_task