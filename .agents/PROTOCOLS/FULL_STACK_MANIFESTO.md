# 📜 Full Stack Manifesto: Anime Scraper Pro v2.1
**Vision:** Zero Friction, Near 0ms Latency, $0 Cost Infrastructure.
**Architecture:** Wrapper-Centric / Distributed Edge Streaming.

---

## 1. 🏗️ Current Tech Stack (Active)

### Core Infrastructure
- **Frontend:** Next.js 15 (App Router), Tailwind CSS 4, Framer Motion.
- **Backend (API):** FastAPI (Python 3.12) hosted on Hugging Face Spaces.
- **Database:** Neon Postgres (Serverless) - Metadata, Mappings, Social Data.
- **Auth:** BetterAuth (Integrated with Neon & Next.js).
- **Cache & Queue:** Upstash Redis (SWR Cache) & QStash (Task Queueing).
- **Deployment:** Cloudflare Pages (Frontend) & Direct Terminal Upload (Deploy Scripts).

### Scraping & Extraction Engine
- **Dynamic Scraper:** `curl_cffi` with **TLS Spoofing** (Chrome Fingerprint impersonation).
- **Parsing:** BeautifulSoup4 + `lxml`.
- **Security Bypass:** AES-256 Decryption (PyCryptodome) for provider payloads.
- **Self-Healing:** `SmartExtractor` regex-based fallback for direct link discovery.

### Streaming Pipeline
- **Video Player:** Custom Native React Player with `Hls.js` (Dynamic Import).
- **Strict Mode:** 100% Iframe-free policy. Only `.m3u8` and `.mp4` allowed.
- **Resilient Ladder (Tiered Access):**
    - **Tier 0 (Swarm):** Check DB for Telegram-cached segments (0ms latency).
    - **Tier 1 (Reconciler):** Match cached provider direct URLs via Redis.
    - **Tier 2 (On-the-fly):** Resolve provider URLs with title variants.
    - **Tier 3 (Last Resort):** Direct HTML search per provider.
    - **Tier 4 (Background Ingest):** If a new direct URL is found, auto-enqueue to QStash for Telegram Swarm processing.
- **Edge Proxy:** Cloudflare Workers for Referer Rewriting & M3U8 Segment Rewriting.

---

## 2. 🚀 Recommended Future Stack (The "Gudang" Engine)

### Ingestion & Processing (High Priority)
- **GitHub Actions Worker:** Use as free compute for heavy tasks (FFmpeg transcoding).
- **HLS Segmenter:** Automate conversion from `.mp4` to encrypted `.ts` segments.
- **Steganography Tool:** Hide video data inside image containers (`.jpg/.png`) for "Immortal Storage" on Telegram.

### Distributed Storage Swarm
- **Google Drive API v3:** Multiple Service Accounts (Swarm) to bypass 24h download quotas.
- **Telegram MTProto Bridge:** Unlimited storage using private channels as a decentralized CDN.
- **Cloudflare R2:** Transient storage (7-day TTL) for trending/hot episodes.

### Social & Economy Engine
- **Reward System:** Gated content logic (Coins/Keys) stored in Postgres.
- **P2P Streaming:** `p2p-media-loader` integration for WebRTC-based social sharing (reduces server bandwidth).
- **Ad-Integration:** Reward-Video Ads API for free users to earn "Keys".

---

## 3. 🛠️ Critical Protocols for Next Agents
1. **Always use First Principles:** If a link is blocked, don't fallback to Iframe. Fix the Proxy or Ingest the file.
2. **Apple HIG Style:** UI must remain minimal, snappy, and premium.
3. **Lateral Thinking:** Use every free resource (HF, GitHub, Cloudflare, GDrive, Tele) as a combined super-computer.
4. **ABR Standard:** Transition all "Hot" content to Adaptive Bitrate (HLS) for best UX.

---
*Updated by Gemini (Agent 4) - Monday, April 13, 2026*
