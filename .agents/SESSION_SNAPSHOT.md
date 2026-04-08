# Session Snapshot: Multi-Provider Architecture & Otakudesu Integration
**Date:** Wednesday, April 8, 2026
**Lead Architect:** Gemini (Agent 4)

## 1. Project Status
- **Current State:** Successfully migrated to a "Scraper vs Parser" 3-layer architecture (Transport, Parser, Provider Facade) inspired by `wajik-anime-api`.
- **Infrastructure:** Deployed new backend to Hugging Face Spaces.
- **Database:** Total Unique Animes: 39, Total Episodes: 3376. Oploverz (2903 eps) and Otakudesu (473 eps) are active. Samehadaku is temporarily disabled due to WAF/403.

## 2. Key Accomplishments
- **Base Parser & Transport:** Implemented `BaseParser` contract and `SSRFSafeTransport` singleton to isolate network logic from DOM parsing.
- **Otakudesu Refactor:** Successfully decoupled Otakudesu's AJAX-heavy network orchestration from its DOM parsing logic (`providers/otakudesu/provider.py` & `parser.py`).
- **Atomic Upsert:** Solved race conditions during `mass_sync.py` by implementing PostgreSQL `pg_advisory_xact_lock` via `upsert_mapping_atomic` function.
- **Reconciler Cache:** Implemented Upstash Redis cache (TTL 7 days) for reconciler results to save Gemini API quotas and speed up mass sync.
- **Extractor Patch:** Updated `UniversalExtractor` to fallback to `<source src="...">` regex when Desustream (Otakudesu) returns HTML instead of JSON due to Cloudflare Edge. Updated `is_direct` logic to properly classify `googlevideo.com/videoplayback` as a direct `mp4` source.
- **HF Space Deployment:** Synchronized the new backend codebase to the `hf-space` repository and triggered a rebuild on Hugging Face.

## 3. Next Mission (For Agent 1 & Agent 4)
- **CRITICAL BUG (Video Playback):** The newly added Otakudesu anime (e.g., Wandance Ep 1) successfully extracts a direct `googlevideo.com` MP4 URL and displays the thumbnail in the native player. However, **the video fails to play/stream**. This is likely due to IP binding, expired signatures (`expire`, `sig`, `ip` parameters in the Google Video URL), or missing `Referer`/`Origin` headers when the frontend's Next.js proxy (`/api/v1/stream?url=...`) attempts to pipe the video chunks.
- **Agent 1 (Backend):** Investigate the `googlevideo.com` streaming pipeline. Ensure the proxy at `backend/routes/stream.py` correctly handles headers, cookies, and chunking for Google Video URLs, or consider returning the URL directly to the client if the proxy is blocked by Google's IP checks.
- **Agent 4 / 3:** Investigate a bypass for Samehadaku's 403 Forbidden Cloudflare WAF block.