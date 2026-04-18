# 🎯 Handover: Telegram Swarm Storage & Auto-Hunter

## 1. Context Summary
- **Current State:** Major refactor to Modular Monorepo completed (`apps/`, `infra/`, `archive/`). The system architecture is completely rebuilt around `$0 Cost Efficiency` using Hugging Face, Cloudflare Pages/Workers, Upstash, and Telegram.
- **Recent Fixes:** *Ingestion Engine* is now successfully integrated directly into the `apps/api/services` directory. The *Strict Direct Stream* filter is active (No Iframes are allowed to reach the Frontend).
- **Key Breakthrough:** *Pixeldrain Auto-Hunter* logic has been created to extract high-quality, stable MP4 downloads directly from provider download pages, effectively bypassing the 403 Forbidden errors typical of Mp4Upload.
- **Key Files:** 
  - `ARCHITECTURE_V2.md` (Updated System Overview)
  - `apps/api/services/ingestion/main.py` (Core Ingestion Pipeline)
  - `apps/api/services/queue.py` (QStash Delayed Queue Handling)

## 2. Your Mission (Immediate Priority)
Focus on building features that optimize the *Frontend* player and scale the *Backend* automation.

### Step-by-Step Task:
1.  **P2P WebRTC Implementation:** Integrate the `p2p-media-loader` library into `VideoPlayer.tsx` in Next.js to significantly reduce the bandwidth load on our Cloudflare Worker (`tg-proxy`) when hundreds of users watch the same popular episode.
2.  **Multi-Season Auto-Hunter Automation:** Convert our localized `tensura_s1_batch.json` script logic into a permanent Backend Cron Job (`apps/api/scripts/cron_warmup.sh`) capable of auto-hunting Pixeldrain links for S2, S3, and other highly demanded titles.
3.  **Admin UI Rescue Button:** Build an API endpoint and a button in the Admin Dashboard (`apps/web/app/admin/ingestion`) that allows users to manually reset the Redis lock and restart a failed *Ingestion Task* that got stuck due to a Telegram `Rate Limit 429`.

## 3. Tech Standard
- **No Iframes:** Stick with `.m3u8` or `.mp4`.
- **$0 Cost:** Keep optimizing FFmpeg `max_workers` and `Upstash-Delay` to ensure we never hit memory exhaustion (OOM) or Telegram blocks.
- **Apple Style:** Ensure the UI in the Admin Dashboard remains clean and modern (HIG Compliance).

---
*Ready for execution. The backend is stable, scalable, and fully distributed. Good luck, Agent.*
