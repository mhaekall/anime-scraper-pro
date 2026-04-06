# 🗺️ Product Roadmap & Growth Plan

Visi masa depan proyek `anime-scraper-pro` untuk menjadi platform streaming anime nomor satu berbasis Cloudflare & AI.

---

## 1. Visi Jangka Pendek (1-3 Bulan)
**Tujuan:** Stabilitas & Visual (The "Apple" Experience).
- [ ] **UI Polish:** Sempurnakan transisi `framer-motion` (springs/snappy easings) di semua halaman.
- [ ] **Library Revamp:** Implementasikan filter kategori (Watching, Completed, Plan) di halaman koleksi user.
- [ ] **Player v2:** Tambahkan fitur "Skip Intro" dan "Next Episode Auto-play" yang sangat halus.

---

## 2. Visi Jangka Menengah (3-6 Bulan)
**Tujuan:** Ekspansi Platform & Mobile.
- [ ] **PWA (Progressive Web App):** Buat agar aplikasi bisa diinstal di homescreen (Android/iOS) dengan icon kustom.
- [ ] **Chromecast Support:** Memungkinkan user melakukan *cast* video dari HP ke Smart TV mereka.
- [ ] **Comment Section:** Tambahkan sistem komentar berbasis database yang ringan atau menggunakan platform pihak ketiga (Disqus/Giscus).

---

## 3. Visi Jangka Panjang (6+ Bulan)
**Tujuan:** Komunitas & Ekosistem.
- [ ] **AI Recommendation Engine:** Gunakan AI untuk menganalisis kebiasaan nonton user dan memberikan saran anime yang 100% personal.
- [ ] **Multi-language Subtitles:** Implementasikan fitur yang secara otomatis mencari/mengambil subtitle bahasa lain jika tersedia.
- [ ] **Community Sharing:** Memungkinkan user membagikan "Playlist" anime kustom mereka ke publik.

---

## 4. Keberlanjutan & Biaya ($0 Cost Strategy)
- [ ] **Cloudflare Workers:** Pindahkan logika backend tertentu ke Workers untuk mengurangi beban server utama.
- [ ] **Upstash Redis:** Optimalkan penggunaan memori di Redis agar tetap berada dalam kuota gratis (Free Tier).
- [ ] **Neon DB:** Pantau penggunaan storage Postgres agar tetap di bawah batas gratis Neon.
