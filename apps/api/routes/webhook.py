import json
import asyncio
import os
import sys
import traceback
from fastapi import APIRouter, HTTPException, Request, Response
from qstash import Receiver
from upstash_workflow.fastapi import Serve
from upstash_workflow import AsyncWorkflowContext
import httpx

# Import services
from services.config import QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
from services.pipeline import sync_anime_episodes
from services.cleanup import cleanup_expired_cache, vacuum_old_episodes
from services.prefetch import smart_prefetch_episodes
from db.connection import database

# Inisialisasi Router (Hapus prefix ganda)
router = APIRouter()

# Inisialisasi Upstash Workflow Serve
serve = Serve(router)

# Import ingestion engine gracefully
try:
    from services.ingestion.main import IngestionEngine
except Exception as e:
    print(f"[Webhook Init] IngestionEngine import failed: {e}")
    IngestionEngine = None

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
        api_public_url = os.getenv("API_PUBLIC_URL", "https://jonyyyyyyyu-anime-scraper-api.hf.space").rstrip("/")
        public_url = f"{api_public_url}{request.url.path}"
        
        receiver.verify(
            body=body.decode("utf-8"),
            signature=signature,
            url=public_url
        )
    except Exception as e:
        print(f"[QStash] Invalid Signature: {e}")
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return body

# --- 🍿 STANDAR WEBHOOKS ---

@router.post("/webhook/sync")
async def sync_webhook(request: Request):
    body = await _verify_qstash(request)
    try:
        payload = json.loads(body)
        anilist_id = payload.get("anilistId")
        if not anilist_id:
            raise ValueError("anilistId missing in payload")
        await sync_anime_episodes(anilist_id)
        return Response(status_code=200, content="Sync Completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/cleanup")
async def cleanup_webhook(request: Request):
    await _verify_qstash(request)
    try:
        await cleanup_expired_cache()
        await vacuum_old_episodes()
        return Response(status_code=200, content="Cleanup Completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook/prefetch")
async def prefetch_webhook(request: Request):
    await _verify_qstash(request)
    try:
        result = await smart_prefetch_episodes()
        return Response(status_code=200, content=json.dumps(result))
    except Exception as e:
        print(f"[Webhook] Error running prefetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 🚀 LEGACY INGESTION (Needed by QStash) ---

async def _run_ingestion_bg(episode_id, anilist_id, provider_id, episode_number, direct_url):
    try:
        if IngestionEngine is None:
            print("[Webhook] IngestionEngine is not available.")
            return
        engine = IngestionEngine()
        await engine.process_episode(episode_id, anilist_id, provider_id, episode_number, direct_url)
    except Exception as e:
        print(f"[Webhook] Background ingestion failed: {e}")

@router.post("/webhook/ingest")
async def ingest_webhook(request: Request):
    body = await _verify_qstash(request)
    try:
        payload = json.loads(body)
        episode_id = payload.get("episode_id")
        anilist_id = payload.get("anilist_id")
        provider_id = payload.get("provider_id")
        episode_number = payload.get("episode_number")
        direct_url = payload.get("direct_url")
        
        print(f"[Webhook] Executing Ingestion for anilistId={anilist_id} Ep={episode_number}")
        
        # Jalankan di latar belakang agar QStash tidak timeout
        asyncio.create_task(_run_ingestion_bg(episode_id, anilist_id, provider_id, episode_number, direct_url))
        
        return Response(status_code=200, content="Ingestion Queued")
    except Exception as e:
        print(f"[Webhook] Error processing ingestion payload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 🚀 ENTERPRISE WORKFLOW INGESTION ---

@serve.post("/webhook/ingest-workflow")
async def ingestion_workflow(context: AsyncWorkflowContext):
    payload = context.request_payload
    anime_slug = payload.get("anime_slug")
    episode = payload.get("episode")
    
    # Step 1: Resolve provider link
    source_url = await context.run(
        "resolve-provider",
        lambda: httpx.get(f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v1/resolve/{anime_slug}/{episode}").json()
    )

    # Step 2: Trigger FFmpeg processing
    ingest_task = await context.run(
        "trigger-processing",
        lambda: httpx.post(
            "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v1/ingest",
            json={"url": source_url["direct_link"], "slug": anime_slug, "ep": episode}
        ).json()
    )

    # Step 3: Finalize DB sync
    await context.run(
        "finalize-db",
        lambda: httpx.post(
            "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v1/db/sync-episode",
            json={"slug": anime_slug, "episode": episode, "tg_urls": ingest_task["segments"]}
        ).json()
    )

    return {"status": "success", "slug": anime_slug, "ep": episode}
