# Session Snapshot: Samehadaku Integration & Workspace Cleanup
**Date:** Wednesday, April 8, 2026
**Lead Architect:** Gemini (Agent 4)

## 1. Project Status
- **Current State:** Successfully expanded Datacenter coverage by adding **Samehadaku** as the 3rd major provider.
- **Provider Status:**
  - **Oploverz:** Active & Stable.
  - **Otakudesu:** Active & Stable (Backend patch for Google Video applied).
  - **Samehadaku:** **NEWly Integrated**. Bypassed Cloudflare WAF 403 using specific Edge browser fingerprinting.

## 2. Key Accomplishments
- **Workspace Cleanup:** Removed all temporary test and debug scripts from the root and backend directories.
- **Samehadaku Bypass:** Discovered that Samehadaku's WAF accepts a specific User-Agent (`Chrome/136... Edg/136...`).
- **Samehadaku Refactor:** Implemented `providers/samehadaku/` using the 3-layer architecture (Transport, Parser, Provider).
- **URL Routing Fix:** Corrected `build_provider_series_url` in `pipeline.py` to include the mandatory `/anime/` prefix for Samehadaku slugs.
- **Mass Sync Upgrade:** Enabled Samehadaku targets in `mass_sync.py` with custom header support.

## 3. Next Mission (For Agent 3 & Agent 1)
- **Mapping Optimization:** Some Samehadaku titles (e.g., Marriagetoxin) are not matching AniList IDs automatically due to title differences. Agent 3 should investigate adding "Title Aliases" or lowering the similarity threshold for Samehadaku specifically.
- **Kuramanime/Doronime:** Follow the same 3-layer pattern to add these remaining providers to reach the 5.000+ anime target.
- **Frontend Video Player:** Continue monitoring if the Google Video patch (Direct GET proxy) resolves the 503 issue permanently.

## 4. Big Tech Audit & "Zero Cost" Architectural Blueprint (Fase Selanjutnya)
**Evaluasi dari Senior Dev AI (Eksternal):**
- **Kekuatan Utama:** Arsitektur Hybrid Edge/Cloud (UI Edge, Scraping HF) sangat cerdas. Penggunaan SWR, Drizzle ORM, Atomic Upserts, JSONB Payload, dan Distributed Locks membuktikan kematangan berpikir ("Big Brain Move" untuk $0 Cost Strategy).
- **Kelemahan Kritis (Tech Debt):** 
  - FastAPI (0.99.1) dan Pydantic v1 sudah outdated. Harus di-upgrade ke v2 untuk 2-10x performa serialisasi.
  - Migrasi skema database masih *inline raw SQL* di `main.py` (sangat beresiko *race condition*). Wajib pindah ke **Alembic**.
  - Tabel `video_cache` tidak memiliki *background job* untuk *cleanup* data yang *expired*. Ini membahayakan kuota *storage* gratis Neon (0.5GB).
  - Belum ada kedisiplinan *Testing* (pytest) dan CI/CD (GitHub Actions).
  - *Table* database kekurangan kolom `created_at` (standar *auditing*).

**Tugas Sesi Berikutnya (CRITICAL QUICK WINS - Hari Ini):**
1. **Agen 1 (Backend):** 
   - Lakukan `pip install --upgrade fastapi pydantic` dan sesuaikan sintaksis kode yang *breaking* ke Pydantic v2.
   - Pindahkan migrasi *inline* SQL di `main.py` menggunakan **Alembic**. Buat *initial migration* yang proper.
   - Tambahkan *cron background job* (atau manfaatkan QStash) untuk menjalankan SQL: `DELETE FROM video_cache WHERE "expiresAt" < NOW()` setiap 6 jam agar *storage* Neon tetap ramping.
2. **Agen 4 (Lead):** 
   - Konfigurasikan **GitHub Actions CI** sederhana untuk `pytest` dan *linting* (Ruff).
   - Tambahkan `robots.txt` dengan *noindex* di *Frontend* agar Google tidak mengindeks *endpoint proxy stream* kita dan diblokir oleh *provider*.
