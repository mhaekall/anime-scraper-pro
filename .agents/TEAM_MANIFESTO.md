# Orca: Team Manifesto
**Philosophy:** First Principles, Lateral Thinking, $0 Production.
**Standard:** Apple Senior Design Developer (HIG Compliance).

## 1. Core Mandates
- **Single Source of Truth (SSoT):** Anilist ID adalah identitas utama.
- **Performance:** Target 0ms perceived latency via SWR and Edge Caching.
- **Cost:** $0 infrastructure using Hugging Face (Backend), Cloudflare (Frontend/Edge), and Upstash (Database/Redis).
- **Resilience:** 3-Tier Fallback (DB -> Semantic Search -> Last Resort Search).

## 2. Technical Stack
- **Frontend:** Next.js (App Router), TypeScript, Tailwind (Vanilla CSS preference).
- **Backend:** FastAPI (Python), Gemini 2.0 Flash (Semantic Arbiter).
- **Database:** PostgreSQL & Redis (Upstash Serverless).
