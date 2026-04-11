# ⚙️ Backend Strategy Plan

Rencana pengembangan mesin inti (FastAPI) untuk meningkatkan skalabilitas, keamanan, dan performa scraping.

---

## 1. Arsitektur & Modularisasi
**Masalah:** `main.py` terlalu besar (>1000 baris).
**Rencana:**
- [ ] **Pecah Routes:** Pindahkan endpoint ke `backend/routes/` (e.g., `anime.py`, `user.py`, `stream.py`).
- [ ] **Service Layer:** Pisahkan logika bisnis (logic scraping berat) ke `backend/services/`.
- [ ] **Provider Cleanup:** Pastikan setiap provider di `backend/providers/` memiliki kelas induk yang seragam untuk mempermudah penambahan sumber baru (e.g., Samehadaku, Anoboy).

---

## 2. Keamanan Video Proxy (Streaming)
**Tujuan:** Mencegah pencurian bandwidth oleh pihak ketiga.
- [ ] **Signed URLs:** Implementasikan token sementara (HMAC) pada link `/api/v1/stream`. Link hanya aktif selama 2 jam.
- [ ] **Referer Check:** Blokir request video jika `Referer` bukan dari domain resmi aplikasi.
- [ ] **HLS Segment Rewriting:** Sempurnakan penggantian link `.ts` di dalam file `.m3u8` agar 100% trafik tersembunyi di balik domain proxy.

---

## 3. Optimasi Scraper & Cache
- [ ] **Predictive Scraping:** Saat user menonton Episode X, secara otomatis scraper mulai mengambil data Episode X+1 di latar belakang (background task) dan menyimpannya di Redis.
- [ ] **Global Search Engine:** Buat endpoint pencarian universal yang melakukan query ke semua provider secara paralel (concurrent) untuk hasil yang lebih cepat.
- [ ] **Error Handling:** Implementasikan *circuit breaker* agar jika satu provider (e.g., Oploverz) down, sistem otomatis beralih ke provider cadangan (e.g., Otakudesu).

---

## 4. Roadmap Teknis
- **Fase 1:** Refactoring `main.py` menjadi modul-modul kecil.
- **Fase 2:** Implementasi JWT/Signed URL untuk keamanan streaming.
- **Fase 3:** Penambahan provider anime baru dan sistem notifikasi (Push API).
