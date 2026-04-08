import json
from fastapi import APIRouter, HTTPException, Request, Response
from qstash import Receiver
from services.config import QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
from services.pipeline import sync_anime_episodes

router = APIRouter()

# Instantiate QStash Receiver if keys are provided
receiver = None
if QSTASH_CURRENT_SIGNING_KEY and QSTASH_NEXT_SIGNING_KEY:
    receiver = Receiver(
        current_signing_key=QSTASH_CURRENT_SIGNING_KEY,
        next_signing_key=QSTASH_NEXT_SIGNING_KEY,
    )

@router.post("/webhook/sync")
async def sync_webhook(request: Request):
    """
    QStash Webhook endpoint for asynchronously syncing anime episodes.
    Requires valid Upstash-Signature header.
    """
    if not receiver:
        # If QStash isn't configured, optionally accept or reject.
        # For security, we should reject if we expect signatures.
        raise HTTPException(status_code=500, detail="QStash keys not configured on server")

    body = await request.body()
    signature = request.headers.get("Upstash-Signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing Upstash-Signature header")

    try:
        # Verify the signature
        receiver.verify(
            body=body.decode("utf-8"),
            signature=signature,
            url=str(request.url)
        )
    except Exception as e:
        print(f"[QStash] Invalid Signature: {e}")
        raise HTTPException(status_code=401, detail="Invalid signature")

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