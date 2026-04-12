import json
from fastapi import APIRouter, HTTPException, Request, Response
from qstash import Receiver
from services.config import QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
from services.pipeline import sync_anime_episodes
from services.cleanup import cleanup_expired_cache, vacuum_old_episodes
from db.connection import database

router = APIRouter()

# Instantiate QStash Receiver if keys are provided
receiver = None
if QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY:
    receiver = Receiver(
        current_signing_key=QSTASH_CURRENT_SIGNING_KEY,
        next_signing_key=QSTASH_NEXT_SIGNING_KEY,
    )

async def _verify_qstash(request: Request):
    if not receiver:
        raise HTTPException(status_code=500, detail="QStash keys not configured on server")

    body = await request.body()
    signature = request.headers.get("Upstash-Signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing Upstash-Signature header")

    try:
        receiver.verify(
            body=body.decode("utf-8"),
            signature=signature,
            url=str(request.url)
        )
    except Exception as e:
        print(f"[QStash] Invalid Signature: {e}")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return body

@router.post("/webhook/sync")
async def sync_webhook(request: Request):
    """
    QStash Webhook endpoint for asynchronously syncing anime episodes.
    """
    body = await _verify_qstash(request)

    # Process payload
    try:
        payload = json.loads(body)
        anilist_id = payload.get("anilistId")
        if not anilist_id:
            raise ValueError("anilistId missing in payload")
            
        print(f"[Webhook] Executing sync for anilistId={anilist_id}")
        await sync_anime_episodes(anilist_id)
        
        return Response(status_code=200, content="Sync Completed")
    except Exception as e:
        print(f"[Webhook] Error processing payload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/cleanup")
async def cleanup_webhook(request: Request):
    """
    Cron endpoint via QStash to clean up expired video caches 
    and save the 0.5GB Neon DB limit.
    """
    await _verify_qstash(request)
    
    try:
        await cleanup_expired_cache()
        await vacuum_old_episodes()
        print("[Webhook] Completed full DB vacuum cycle")
        
        return Response(status_code=200, content="Cleanup Completed")
    except Exception as e:
        print(f"[Webhook] Error running cleanup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/ingest")
async def ingest_webhook(request: Request):
    """
    QStash Webhook endpoint for asynchronously ingesting anime episodes
    to Telegram Swarm Storage.
    """
    body = await _verify_qstash(request)

    try:
        payload = json.loads(body)
        episode_id = payload.get("episode_id")
        anilist_id = payload.get("anilist_id")
        provider_id = payload.get("provider_id")
        episode_number = payload.get("episode_number")
        direct_url = payload.get("direct_url")
        
        if not all([episode_id, anilist_id, provider_id, episode_number, direct_url]):
            raise ValueError("Missing parameters in payload")
            
        print(f"[Webhook] Executing Ingestion for anilistId={anilist_id} Ep={episode_number}")
        
        engine = IngestionEngine()
        await engine.process_episode(episode_id, anilist_id, provider_id, episode_number, direct_url)
        
        return Response(status_code=200, content="Ingestion Completed")
    except Exception as e:
        print(f"[Webhook] Error processing ingestion payload: {e}")
        raise HTTPException(status_code=500, detail=str(e))
