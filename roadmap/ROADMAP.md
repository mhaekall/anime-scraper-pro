# Anime Scraper Pro - Enterprise Roadmap

This roadmap merges the strategic vision for transitioning from a prototype to a production-ready application, incorporating critical architectural fixes and advanced feature implementations.

## 🚀 Fase 1: Core Engine Stabilization & Advanced Extraction (Current Priority)
Fase ini berfokus pada perbaikan mesin *scraper* yang masih rapuh dan mengekstraksi data secara penuh dari payload aplikasi Svelte Oploverz.

*   [ ] **Perbaikan Resolver Video (Bug 1):** `oplo2.4meplayer.pro` saat ini hanya ditangkap sebagai *iframe* mentah. Backend harus melakukan *HTTP GET* ke URL `4meplayer.pro` tersebut, membongkar HTML-nya, dan mengekstrak URL `.m3u8` atau `.mp4` asli agar fitur pemilih resolusi (360p, 720p, 1080p) di *player* berfungsi murni tanpa melompat ke server berbeda.
*   [ ] **Sinkronisasi `BASE_URL` (Bug 2):** Menyeragamkan penggunaan target domain (seperti `o.oploverz.ltd` vs `anime.oploverz.ac`) di seluruh *endpoint* (`/api/home`, `/api/series`, `/api/series-detail`) untuk mencegah kerusakan tautan (*broken link*).
*   [ ] **Svelte Payload Parsing (Bug 3):** Membuang Regex pencarian HTML string (seperti `episodeNumber:`) dan beralih ke ekstraksi JSON terstruktur dari tag `<script type="application/json" data-sveltekit-fetched>` atau fungsi `kit.start(...)`. Ini menjamin akurasi 100% pada ekstraksi episode.
*   [ ] **Ekstraksi `downloadUrl`:** Mengekstrak array unduhan (kualitas dan tautan) dari payload JSON Oploverz dan menyajikannya ke tombol "Unduh" di *Watch Page*.

## 🗄️ Fase 2: Cloud Infrastructure & Database Layer
Fase ini mengamankan aplikasi dari kehilangan data saat server *restart* dan membuka pintu untuk fitur sosial interaktif.

*   [ ] **Redis Caching Pipeline (Bug 4):** Mengganti `TTLCache` (in-memory Python) dengan Upstash Redis atau Redis Cloud. Ini menjamin *cache* (seperti data AniList) bertahan saat mesin Hugging Face tertidur (sleep) atau *restart*, dan memungkinkan skalabilitas multi-worker.
*   [ ] **Integrasi Supabase (PostgreSQL):** Menyiapkan arsitektur *database serverless*.
*   [ ] **Cloud Watch History:** Memindahkan fitur "Melanjutkan Tontonan" dari *localStorage* (klien) ke Supabase. Pengguna bisa melanjutkan tontonan di PC meski terakhir menonton di HP.

## 🤝 Fase 3: User Experience, Social & PWA
Fase ini menyulap aplikasi menjadi produk kelas industri sungguhan (seperti iQIYI/Netflix/Bstation).

*   [ ] **NextAuth (OAuthentication):** Fitur masuk (*Login/Register*) menggunakan akun Google, Discord, atau GitHub.
*   [ ] **Fitur Komunitas Real-Time:** Mengubah *mockup* komponen "Komentar", "Suka/Tidak Suka", dan "Koleksi" menjadi sistem basis data relasional (menggunakan Supabase) yang berfungsi secara *real-time*.
*   [ ] **Progressive Web App (PWA):** Menanamkan *Service Worker* dan file `manifest.json` agar *website* ini bisa di-instal layaknya aplikasi *Native* (berbentuk ikon) di *homescreen* Android dan iOS pengguna, lengkap dengan fitur *Offline Fallback* layar peringatan koneksi.
*   [ ] **Multi-Provider Engine (Abstraksi):** Memisahkan *scraper* Oploverz menjadi sebuah `Provider/Adapter`. Membuka jalan untuk menyuntikkan target situs baru (Otakudesu, Samehadaku, dll) secara *plug-and-play* tanpa merusak kode utama.
