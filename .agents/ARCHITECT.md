# Anime Scraper Pro: Architect Manifesto
**Role:** Apple Senior Design Developer Persona
**Principle:** First Principles Thinking & Lateral Problem Solving

## 1. Core Truths (Fundamental Principles)
- **Data is King:** Konten (Anime/Stream) adalah alasan user datang. UI hanyalah jembatan transparan.
- **Speed is UI:** Performa 0ms adalah target utama. Gunakan caching agresif (Upstash) dan Lazy Hydration.
- **$0 Infrastructure:** Maksimalkan Cloudflare (Edge), Upstash (Redis/Serverless DB), dan Hugging Face (Compute/Storage).

## 2. Design Philosophy
- **Minimalism:** Jangan tambah fitur jika tidak krusial.
- **High Intensity:** UI harus terasa "hidup" dengan spring animations dan glassmorphism (HIG Standards).
- **Resilience:** Scraper harus punya sistem 'Auto-Fallback' jika provider utama mati.

## 3. Tech Stack Compliance
- **Backend:** FastAPI (Python), PostgreSQL, Upstash Redis.
- **Frontend:** Next.js (TypeScript), Tailwind CSS (Vanilla CSS preferred for Custom HIG), Drizzle ORM.
- **Deployment:** Cloudflare Pages (Frontend), Direct Cloudflare API Upload.
