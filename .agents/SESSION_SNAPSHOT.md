# Session Snapshot: Wrapper-Centric Architecture, Swarm Proxy & Kuronime Decryption
**Date:** Friday, April 10, 2026
**Lead Architect:** Gemini (Agent 4)

## 1. Project Status
- **Current State:** Berhasil melakukan perombakan arsitektur besar-besaran (Major Overhaul) dari *Website-Centric* menjadi **Wrapper-Centric / Direct Stream Aggregator**.
- **Frontend Status:** 100% Bersih dari Iframe. Pemutar video kini secara absolut merupakan *Native Player* Next.js yang hanya menerima URL berakhiran `.mp4` atau `.m3u8` murni.
- **Provider Status (Re-prioritized):**
  - **Kuronime (Priority 1):** **NEWLY INTEGRATED**. Mengekstrak *payload* terenkripsi (AES CryptoJS) via `pycryptodome` untuk mendapatkan akses langsung ke *Server HLS* (m3u8) pribadi Kuronime dan ratusan *mirror* (Krakenfiles, Mp4upload).
  - **Samehadaku (Priority 1):** Sumber utama *Direct Stream* via ekstraksi mentah Wibufile.
  - **Oploverz (Priority 2):** Dipertahankan sebagai *fallback metadata* dan *hunting wrapper* (4meplayer, Oplo2).
  - **Doronime (Priority 3):** Dipertahankan.
  - **Otakudesu (Priority 4):** Dipertahankan sebagai cadangan untuk ekstraksi *wrapper* DesuDrives (JSON API tersembunyi).

## 2. Key Accomplishments (Big Tech Architecture)
- **Zero-Cost Rotating Proxy (Cloudflare Swarm Proxy):** Dideploy *Worker Script* (`worker-proxy/`) ke jaringan *edge* Cloudflare untuk mendapatkan rotasi IP global secara otomatis dan mengelabui pemblokiran *anti-bot* dari provider. Terintegrasi langsung di `transport.py`.
- **Asynchronous Task Queue (Mass Scalability):** Beralih dari scraping *synchronous* yang memblokir memori menjadi delegasi asinkronus. Mengimplementasikan dukungan **Upstash QStash** untuk eksekusi ratusan bot paralel. Juga mengimplementasikan **Local Asyncio Background Tasks** di dalam *event loop* FastAPI sebagai *fallback* ketika token QStash tidak tersedia.
- **Advanced Admin Dashboard (`/admin`):** Membangun UI *Data-Driven* yang eksploitatif di *frontend*. Memiliki fitur *Live Database Grid* (menampilkan *cover*, *genre*, dan jumlah episode), Filter "0 Episode", eksekusi paksa *sync* per-ID, dan *Live Terminal Logs*.
- **Isekai/Fantasy Targeted Mass-Sync:** Mengubah algoritma dari "Top 100 Anilist" menjadi "Scrape-First, Map-Later" langsung dari katalog Genre Fantasy/Isekai Samehadaku untuk memastikan anime yang ditarik pasti memiliki *Direct Stream* Wibufile.
- **Injeksi Masterpiece:** Sukses menarik dan memetakan ribuan episode untuk *One Piece*, *Jujutsu Kaisen S3*, *Demon Slayer (Infinity Castle)*, seluruh musim *Tensura*, *Classroom of the Elite*, dan *Mushoku Tensei*.
- **Big Tech Optimizations:**
  - Menerapkan **Connection Pooling Limits** (`httpx.Limits`) di *transport layer* untuk mencegah kehabisan *file descriptor* (soket).
  - Mengimplementasikan **Exponential Backoff & Rate-Limit Retry** untuk API GraphQL Anilist (`429 Too Many Requests`).
  - Menerapkan **Graceful Degradation** di dekriptor AES Kuronime dengan blok `try-except` agar *server* tidak *crash* jika kunci enkripsi diubah.
- **Workspace Cleanup:** Membersihkan hampir 80 file *dump* HTML dan skrip *ad-hoc testing* dari repositori untuk menjaga integritas *codebase*.

## 3. Unexecuted Ideas & Suboptimal Areas (Saran untuk Sesi Berikutnya)
Sistem saat ini sudah sangat tangguh untuk standar produksi, namun masih memiliki celah optimalisasi:

1. **Auto-Healing Extractor (Agentic Regex):** `UniversalExtractor` saat ini masih menggunakan aturan (Regex) statis yang diketik manual. Jika *DesuDrives* atau *Wibufile* mengubah struktur DOM mereka esok hari, ekstraksi akan gagal. **Saran:** Integrasikan API LLM ringan (Gemini 2.0 Flash) di *backend* untuk bertindak sebagai *fallback parser* yang bisa menyusun ulang Regex baru secara *on-the-fly* jika deteksi awal gagal (Self-Healing Code).
2. **Reverse Proxy M3U8 (CORS Bypass):** Kuronime memuntahkan tautan HLS (`.m3u8`). Saat ini, jika *frontend* memutar *link* HLS mentah dari peladen pihak ketiga, ada risiko terkena *CORS block* atau pelacakan IP pengguna akhir oleh penyedia. **Saran:** Buat satu lagi Cloudflare Worker (`stream-proxy`) khusus untuk melakukan *piping/streaming chunk video* ke *frontend* (menyembunyikan sumber aslinya).
3. **Database Migration Pipeline (Alembic):** Kritik dari agen sebelumnya masih berlaku. Skema database (Neon Postgres) masih dibuat secara *inline* (*create table if not exists*). **Saran:** Migrasikan sepenuhnya ke *Alembic* (`backend/migrations`) agar perubahan skema (seperti penambahan kolom) bisa dilacak versinya (*version controlled*).
4. **Pembersihan Cache Otomatis (Storage Optimization):** Tabel `video_cache` menumpuk *URL stream* dengan *expired time*. Jika tidak pernah dihapus, batas gratis 500MB dari Neon DB akan cepat penuh. **Saran:** Tambahkan tugas berulang (*cron job*) di skrip *background* untuk menjalankan `DELETE FROM video_cache WHERE expiresAt < NOW()`.
5. **Headless Browser (Playwright) untuk Google Video/Blogger:** Ada ribuan anime lama yang hanya ditampung di Blogger (*Google Video Wiz API*). Menembusnya murni dengan Python `httpx` nyaris mustahil tanpa dekripsi *JavaScript V8*. **Saran:** Jika *budget* memungkinkan (atau menemukan *free tier serverless* yang mendukung Puppeteer), buat layanan *microservice* terpisah khusus untuk me-render halaman Blogger dan menyedot tautan videonya.

**Semua perubahan di sesi ini telah disinkronisasikan dan di-*push* ke cabang `master` GitHub (serta di-*deploy* ke Hugging Face dan Cloudflare Pages).** Sistem siap diserahkan ke agen berikutnya!