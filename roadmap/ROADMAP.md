# Anime Scraper Pro - Enterprise Roadmap

This roadmap merges the strategic vision for transitioning from a prototype to a production-ready application, incorporating critical architectural fixes and advanced feature implementations.

## 🚀 Fase 1: Core Engine Stabilization & Advanced Extraction (✅ SELESAI)
Fase ini berfokus pada perbaikan mesin *scraper* yang masih rapuh dan mengekstraksi data secara penuh dari payload aplikasi Svelte Oploverz.

*   [x] **Perbaikan Resolver Video (Bug 1):** `oplo2.4meplayer.pro` saat ini hanya ditangkap sebagai *iframe* mentah. Backend harus melakukan *HTTP GET* ke URL `4meplayer.pro` tersebut, membongkar HTML-nya, dan mengekstrak URL `.m3u8` atau `.mp4` asli agar fitur pemilih resolusi (360p, 720p, 1080p) di *player* berfungsi murni tanpa melompat ke server berbeda.
*   [x] **Sinkronisasi `BASE_URL` (Bug 2):** Menyeragamkan penggunaan target domain (seperti `o.oploverz.ltd` vs `anime.oploverz.ac`) di seluruh *endpoint* (`/api/home`, `/api/series`, `/api/series-detail`) untuk mencegah kerusakan tautan (*broken link*).
*   [x] **Svelte Payload Parsing (Bug 3):** Membuang Regex pencarian HTML string (seperti `episodeNumber:`) dan beralih ke ekstraksi JSON terstruktur dari tag `<script type="application/json" data-sveltekit-fetched>` atau fungsi `kit.start(...)`. Ini menjamin akurasi 100% pada ekstraksi episode.
*   [x] **Ekstraksi `downloadUrl`:** Mengekstrak array unduhan (kualitas dan tautan) dari payload JSON Oploverz dan menyajikannya ke tombol "Unduh" di *Watch Page*.

## 🌟 Fase 2: AniList Data Enrichment (✅ SELESAI)
Memaksimalkan GraphQL API AniList untuk melengkapi metadata tayangan tanpa harus bergantung pada hasil scrape HTML yang rentan rusak.

*   [x] **Penambahan GraphQL Fields:** Mengambil status (`RELEASING`/`FINISHED`), musim tayang, daftar studio animasi, total episode resmi, dan rekomendasi tontonan.
*   [x] **Penyuntikan ke API Detail:** `/api/series-detail` kini langsung menyertakan metadata penuh dari AniList yang siap dirender di UI.

## 🍿 Fase 3: Advanced Native Player & UI/UX (✅ SELESAI)
Membuang *iframe* usang dan menggantinya dengan pemutar Native HLS.js milik sendiri.

*   [x] **Custom Player (HLS & MP4):** Menambahkan `Player.tsx` khusus dengan fitur Auto-Hide, Keyboard Shortcuts (Youtube-style), dan sinkronisasi durasi lintas-resolusi.
*   [x] **Metadata Injection ke UI:** Menyuntikkan hasil Fase 2 (Status, Musim, Studio) ke halaman detail tontonan.

## ⚡ Fase 4: Upstash Redis & Background Cron Worker (✅ SELESAI)
Memisahkan proses *scraping* dari halaman utama (*Frontend*) untuk menembus batas latensi (0ms load time).

*   [x] **Hugging Face Cron Job:** Membuat fungsi `asyncio.create_task` di FastAPI untuk men-scrape halaman depan Oploverz/Otakudesu setiap 1 jam di latar belakang.
*   [x] **Upstash Redis Pipeline:** Membuang in-memory cache dan menyimpan JSON berukuran besar langsung ke Serverless Redis (Upstash) via REST API.
*   [x] **0ms Home API:** Rute `/api/home` dimodifikasi menjadi sekadar mengambil data statis dari Redis, memberikan waktu respon instan.

## 🗄️ Fase 5: Supabase, Drizzle ORM, & Better-Auth (✅ SELESAI)
Membangun lapisan *Database* permanen dengan arsitektur Edge-friendly menggunakan prinsip *Lateral Thinking*.

*   [x] **Drizzle ORM & Postgres:** Menggunakan koneksi PostgreSQL (via driver `postgres`) langsung ke Supabase untuk menulis skema *watch_history* dan *users*.
*   [x] **Better-Auth (Google Login):** Menyingkirkan Supabase Auth demi Better-Auth (Google Provider) yang dikonfigurasi menancap langsung ke adapter Drizzle ORM.
*   [x] **Halaman Profil (`/profile`):** Membangun UI *Glassmorphism* untuk pengguna agar bisa masuk (*Login*) dan keluar (*Logout*).
*   [x] **Sinkronisasi Lanjutkan Tontonan:** Memugar `Player.tsx` untuk melakukan `POST /api/history` setiap 15 detik ke *Cloud*, menggeser `localStorage`.

## 🕸️ Fase 6: Multi-Source Engine & PWA (SELANJUTNYA)
Mengubah arsitektur *scraper* dari *Single-Source* (hanya Oploverz) menjadi arsitektur modular (*Provider Pattern*) yang mampu melakukan *Fallback*.

*   [ ] **Arsitektur Modular:** Memisahkan logika Oploverz ke dalam `backend/providers/oploverz.py`.
*   [ ] **Provider: Otakudesu:** Membuat `backend/providers/otakudesu.py` dengan penanganan khusus: Bypass proteksi Cloudflare (menggunakan User-Agent Mobile) dan ekstraksi *Nonce* AJAX (`action=2a79a4440f&nonce=...`) untuk mendapatkan iframe video.
*   [ ] **Aggregator Endpoint (`/api/multi-source`):** Membangun *endpoint* baru yang akan menembak ke semua *provider* secara paralel.
*   [ ] **Serwist PWA:** Mengubah situs Next.js menjadi *Progressive Web App* yang dapat diinstal dan bekerja secara *offline-first*.

