# Arsitektur Review & Roadmap Perbaikan (Master Index)

Dokumen ini adalah ringkasan dari audit teknis Claude untuk proyek `anime-scraper-pro-v3`. Karena detail teknis sangat panjang, panduan ini dibagi menjadi beberapa file spesifik.

## 🚀 Status Saat Ini
- **Backend:** Python FastAPI (Scraper + Redis Cache)
- **Frontend:** Next.js 15 + React 19 + Tailwind 4
- **Database:** Neon Postgres (Drizzle ORM)
- **Auth:** Better Auth

---

## 🛠️ Daftar Perbaikan Teknis (Deep-Dive)

Silakan buka file di bawah ini untuk melihat detail kode dan konfigurasinya:

1.  **[Cloudflare Edge Runtime Setup](./tech-01-cloudflare-runtime.md)**
    - Fix error `async_hooks`.
    - Konfigurasi `wrangler.toml` & `next.config.mjs`.
    - Setup Better-Auth agar kompatibel dengan Edge.

2.  **[Watch History State Sync (SWR)](./tech-02-watch-history-swr.md)**
    - Implementasi `useWatchHistory` hook.
    - Sinkronisasi `localStorage` dengan Cloud Database.
    - Optimistic Updates untuk UI yang instan.

3.  **[Security: Dynamic SSRF Guard](./tech-03-ssrf-mitigation.md)**
    - Pemblokiran berdasarkan IP Range (Private/Internal).
    - Custom HTTPX Transport untuk keamanan scraping.

4.  **[Distributed Lock & Cron Job](./tech-04-distributed-lock.md)**
    - Mencegah konflik antar instance backend.
    - Implementasi lock berbasis Redis REST API.

5.  **[Database Optimization & Migration](./tech-05-drizzle-indexes.md)**
    - Penambahan index pada tabel `watchHistory` dan `bookmarks`.
    - Panduan migrasi zero-downtime di PostgreSQL.

---

## 🏁 Finishing Phase (Pertanyaan Lanjutan untuk Claude)

### 1. Penanganan "Sudden Exit" pada Player
Bagaimana cara menggunakan **Page Visibility API** agar detik terakhir tontonan tetap tersimpan ke database saat user menutup tab tiba-tiba (sebelum interval 15 detik tercapai)?

### 2. Penanganan Shortlinks pada SSRF Guard
Bagaimana cara mendapatkan URL akhir dari shortlink (bit.ly/cutt.ly) tanpa membuka celah SSRF di setiap lompatan redirect-nya jika `follow_redirects` dimatikan?

---
*Panduan ini disusun untuk memastikan platform Anda siap untuk trafik skala besar (Production-Ready).*
