# Zero-Cost Production Guide
**Goal:** Maintain $0 monthly recurring cost.

## 1. Compute Strategy
- **Edge First:** Gunakan Cloudflare Workers untuk logika ringan.
- **Background Jobs:** Manfaatkan `mass_sync.py` yang dijalankan di environment lokal/CI/CD (Hugging Face Spaces atau GitHub Actions) untuk mengisi database.

## 2. Storage Strategy
- **Metadata:** Simpan di Postgres/Redis (Upstash Free Tier).
- **Media Assets:** Jangan simpan di server kita. Gunakan Proxy atau direct linking dengan SSRF Guard.

## 3. Delivery Strategy
- **Caching:** SWR (Stale-While-Revalidate) di frontend adalah wajib untuk menghindari hit API backend berulang kali.
- **Image Optimization:** Gunakan provider luar (Vercel/Next.js/Cloudflare Image Resizing) atau Proxying yang efisien.
