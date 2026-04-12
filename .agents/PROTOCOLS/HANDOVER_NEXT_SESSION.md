# 🎯 Handover: Ingestion Engine & Swarm Storage Phase

## 1. Context Summary
- **Current State:** Major refactor to Modular Monorepo completed (`apps/`, `services/`, `infra/`).
- **Recent Fixes:** Kuronime & SmartExtractor fully working with TLS Spoofing. Frontend is now **Strict Direct Stream (No Iframe)**.
- **Key Files:** 
  - `.agents/PROTOCOLS/FULL_STACK_MANIFESTO.md` (Project DNA)
  - `apps/api/services/providers.py` (Core Provider Logic)

## 2. Your Mission (Immediate Priority)
Build the **"Ingestion Engine"** in `services/ingestion/` to achieve Near 0ms Latency via private storage (GDrive/Telegram).

### Step-by-Step Task:
1.  **Fetcher:** Create `fetcher.py` to download direct video streams locally using `ffmpeg`.
2.  **Slicer:** Segment MP4 files into HLS (`.ts` segments) for ABR support.
3.  **Uploader:** Build `uploader/gdrive.py` (API v3 Service Accounts) or `uploader/telegram.py` (Bot API) to push segments.
4.  **Database Sync:** Update Neon Postgres `episodes` table with your new private storage URLs.

## 3. Tech Standard
- **No Iframes:** Always aim for direct `.m3u8` or `.mp4`.
- **$0 Cost:** Maximize free tiers of GitHub Actions, GDrive, and Cloudflare.
- **Apple Style:** Ensure the pipeline is fast and failure-tolerant.

---
*Ready for execution. Good luck, Agent.*
