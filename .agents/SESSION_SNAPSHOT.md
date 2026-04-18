# Session Snapshot: Enterprise Scalability & Auto-Hunter

## 🎯 Pencapaian Utama Hari Ini
Sesi ini difokuskan pada peningkatan stabilitas infrastruktur ke level *Enterprise* dan penanganan beban kerja massal (Batch Ingestion):

1. **Auto-Hunter Pixeldrain Berhasil Diimplementasikan**
   - Menyadari bahwa *Direct Stream* (Mp4Upload, KuroPlayer) rentan terhadap *IP Lock* dan *Error 403 Forbidden*, sistem kini memiliki logika cerdas untuk menggali opsi **Download** dari provider (seperti Oploverz).
   - Jika menemukan link `pixeldrain.com` beresolusi 720p/1080p, *Ingestion Engine* akan menjadikannya prioritas utama untuk diunduh dan dipotong karena terbukti kebal *block* dan sangat stabil.

2. **Zigzag Hybrid Distributed Multitasking**
   - Menghadapi ratusan tugas *ingestion* untuk Tensura S1 (24 Episode), kami menemukan bahwa melempar semua tugas sekaligus ke Cloud Hugging Face akan menyebabkan *Crash/OOM*.
   - **Solusi:** Membagi beban kerja. *Worker Lokal* (komputer pengguna) mengeksekusi episode genap, sedangkan *Cloud Worker* (Hugging Face) menangani episode ganjil secara bersamaan (Paralel Terdistribusi).

3. **QStash Delayed Queue & Anti-Rate Limit (Telegram)**
   - Karena Telegram memberlakukan hukuman *Error 429 (Too Many Requests)* saat diberondong ratusan segmen video sekaligus, kami mengaktifkan fitur `Upstash-Delay` di QStash.
   - Antrean kini ditembakkan dengan jeda aman **15 Menit** per episode.
   - *Telegram Uploader* di-update untuk menggunakan hanya 3 *Workers* maksimal dan dilengkapi *Exponential Backoff* (sistem mundur teratur saat kena blokir).

4. **Pembersihan Root Directory (Clean Up)**
   - Lebih dari 60 skrip manual/ *debugging* (`.py`, `.log`, `.json`) yang sebelumnya berserakan di *root* telah dirapikan dan dipindahkan secara permanen ke dalam folder `archive/`.

## 🛠️ Status Arsitektur Terkini
- **Frontend:** *Strict Direct Stream* aktif. Fitur pemilih resolusi (Multi-Resolution 1080p/720p) pada *Video Player* berjalan dengan sukses jika DB menyediakan lebih dari 1 kualitas.
- **Backend (`apps/api`):** Struktur folder `services/ingestion` kini telah disatukan secara resmi ke dalam `apps/api` tanpa *error* impor (`ModuleNotFoundError` terselesaikan).
- **Database:** Mappings untuk S1 Tensura ke Kuronime/Oploverz di-*force-update*.

## 📌 Rencana Sesi Berikutnya (Next Agent)
- [ ] Menerapkan fitur **P2P WebRTC (`p2p-media-loader`)** pada *Frontend* (Next.js) untuk berbagi *bandwidth* antar penonton dan meringankan beban Cloudflare Worker.
- [ ] Mengotomatisasi "Auto-Hunter Pixeldrain" untuk dipicu secara *cron job* ke *season-season* anime lain (S2, S3, dll).
- [ ] Menyediakan opsi perbaikan/ *resume upload* *One-Click* dari UI Admin jika ada *Ingestion* yang nyangkut karena *Rate Limit*.
