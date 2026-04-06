# 💠 Master Strategic Plan: Anime Scraper Pro

Master Plan ini adalah orkestrasi antara Frontend, Backend, dan Infrastruktur untuk mencapai visi produk yang matang.

---

## 🏗️ Struktur Proyek & Tanggung Jawab
- **`/backend` (Engine):** Mesin scraping, proxy video, dan API (Python/FastAPI).
- **`/frontend` (Experience):** Antarmuka pengguna (Next.js/React) dengan standar Apple HIG.
- **`/roadmap` (Vision):** Dokumen strategis masa depan dan panduan teknis jangka panjang.

---

## 🚥 Status Implementasi (Current State)
| Sektor | Fitur Utama | Status | Prioritas Berikutnya |
| :--- | :--- | :--- | :--- |
| **Backend** | HLS Video Proxy | ✅ Stabil | JWT Security & Signed URLs |
| **Backend** | Provider Scraping | ✅ Oploverz, Otakudesu | Samehadaku, Anoboy integration |
| **Frontend** | UI/UX Core | ✅ Glassmorphism | Native Title & Recommendations |
| **Frontend** | Auth & History | ✅ Cloud Sync | Progress Bar on Cards |
| **DB** | Schema | ✅ V2 (Optimized) | Materialized Views for Trends |

---

## 🛠️ Panduan Pengembangan (Developer Guide)
1. **Frontend:** Gunakan `pnpm dev` (tanpa `--turbo` di Termux) dan pastikan desain mengikuti HIG.
2. **Backend:** Gunakan `uvicorn main:app --reload`. Pastikan `SSRF_GUARD` selalu aktif.
3. **Database:** Selalu gunakan `drizzle-kit push` untuk sinkronisasi skema ke Neon DB.

---

## ⚠️ High-Level Risks & Mitigation
- **Risk:** Proxy video disalahgunakan orang lain.
- **Mitigation:** Implementasikan **Signed URLs** segera (Cek `backend/plan.md`).
- **Risk:** Akun Cloudflare/Neon/Upstash melampaui limit gratis.
- **Mitigation:** Optimalkan **Upstash Redis TTL** dan **Cloudflare Edge Cache** (Cek `roadmap/plan.md`).

---

## 📅 Milestones Mendatang
- [ ] **M1:** Penyelesaian Full Video Cloaking (100% hidden source).
- [ ] [ ] **M2:** Peluncuran fitur "Recommendations" (More Like This).
- [ ] **M3:** Beta Testing PWA (Installable di HP).
