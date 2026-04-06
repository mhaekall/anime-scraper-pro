# Arsitektur Review: Streaming Platform (Analisis & Perbaikan Claude)

Dokumen ini berisi ulasan mendalam dan rekomendasi perbaikan dari Claude mengenai arsitektur proyek `anime-scraper-pro-v3`. Eksekusi proyek ini menunjukkan *product taste* yang kuat dan kecepatan pengembangan yang tinggi, namun terdapat beberapa masalah sistemik (*systemic issues*) yang akan menjadi *bottleneck* serius pada skala produksi. Dokumen ini harus dijadikan panduan utama sebelum melakukan peluncuran (*launch*).

---

## 🔴 Critical Issues (Harus Diperbaiki Sebelum Launch)

### 1. Secret Leakage — Severity: P0
Terjadi kebocoran kredensial yang sangat fatal di file backend. Kredensial Upstash Redis di-*hardcode* sebagai nilai *fallback*, yang berarti token tersebut sekarang terekam secara permanen di riwayat Git (Git history).

**Konteks dalam Kode (`backend/main.py` baris 45-46):**
```python
# CURRENT — BERBAHAYA
UPSTASH_REDIS_REST_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "https://close-sunfish-80475.upstash.io")
UPSTASH_REDIS_REST_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "gQAAAAAAATpbAAIncDI3MDZlZTliZDk0ODg0ZTZiOGNkNTIzZDZiZGZjNjJhYXAyODA0NzU")
```

**Langkah Wajib & Solusi:**
*   **Segera *Rotate* (Ganti) token Upstash** melalui dashboard Upstash Anda. Token lama sudah terkompromi.
*   **Hapus *fallback value*** di dalam kode. Jika *environment variable* tidak ditemukan, lebih baik aplikasi gagal berjalan (*fail fast*) daripada mengekspos kredensial ke publik.
*   **Pastikan `backend/.env` masuk ke dalam `.gitignore`**.

### 2. Cloudflare Edge Runtime — async_hooks Error — Severity: P0
Terdapat error kompabilitas *runtime* saat *deployment* ke Cloudflare Pages, yang terlihat jelas pada file `tail.log` dan `wrangler_dev.log`:
`Error: No such module "__next-on-pages-dist__/functions/async_hooks"`

**Akar Masalah (Root Cause):**
Terjadi *architectural mismatch*. Library seperti `better-auth` dan `drizzle-orm` (bersama `@neondatabase/serverless`) sangat bergantung pada Node.js APIs (seperti `async_hooks`, `net`, `tls`) yang secara fundamental **tidak tersedia** di lingkungan Cloudflare Workers/Edge runtime.

Upaya perbaikan sementara di `next.config.mjs` (seperti `config.resolve.fallback = { net: false, tls: false ... }`) atau menggunakan skrip `sed` pada `deploy-cf.sh` tidaklah cukup dan sangat rentan rusak (*brittle*).

**Konteks dalam Kode:**
File `frontend/app/api/auth/[...all]/route.ts` dan `frontend/app/api/history/route.ts` saat ini disetel untuk berjalan di Edge:
```typescript
export const runtime = 'edge'; // INI SALAH UNTUK NODE.JS APIS
```

**Solusi yang Benar (Opsi A: Hybrid Runtime - Recommended):**
Pisahkan batas *runtime* (runtime boundary) secara eksplisit:
*   **Edge Routes:** `/`, `/anime/[id]`, `/explore`, `/watch` (Biarkan `runtime = 'edge'` karena murni *data fetching*).
*   **Node Routes:** `/api/auth`, `/api/history` (Ubah menjadi `runtime = 'nodejs'` agar memiliki akses penuh ke Node.js environment dan database dapat terhubung dengan baik).

**Implementasi:**
```typescript
// app/api/auth/[...all]/route.ts
export const runtime = 'nodejs'; // GANTI DARI 'edge'

// app/api/history/route.ts  
export const runtime = 'nodejs'; // GANTI DARI 'edge'
```
*(Catatan: Opsi lain adalah pindah hosting ke Vercel yang lebih kompatibel dengan Next.js, atau memisahkan Auth/DB ke layanan Worker terpisah yang lebih kompleks).*

---

## 🟠 High Priority Issues

### 3. Background Cron Job — Fatal Race Condition
Fungsi `background_scrape_job()` di `backend/main.py` memiliki masalah keandalan (*reliability*) yang serius dan sangat rapuh.

**Konteks dalam Kode (`backend/main.py` baris 10-16 & 67-83):**
```python
# Saat ini — sangat fragile
@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(background_scrape_job())
    yield
    task.cancel()
```

**Masalah:**
*   **Lingkungan Hosting (misal: Hugging Face Spaces):** Lingkungan ini sering melakukan *hibernate* saat *idle*. Jika *task* mati, Redis tidak akan pernah diperbarui (*stale data*).
*   **Tidak ada *Idempotency Check*:** Jika platform *hosting* menjalankan dua *instance* (mesin) secara bersamaan, keduanya akan melakukan *scraping* dan menulis data ganda (*double write*) ke Redis secara bersamaan, menyebabkan *race condition*.
*   **Error Recovery Buruk:** Terdapat `asyncio.sleep(3600)` tanpa penanganan *error* (error recovery) yang baik. Jika terjadi satu *exception* (misal koneksi putus sesaat), *cron job* akan mati selamanya sampai server di-*restart* manual.

**Solusi yang Benar:**
Gunakan *Distributed Lock* di Redis dan terapkan *Exponential Backoff*. Lebih direkomendasikan lagi menggunakan layanan eksternal seperti **Upstash QStash** sebagai pemicu (trigger) *cron* dari luar.
```python
async def background_scrape_job():
    while True:
        try:
            # Distributed lock untuk mencegah double-run antar instance
            lock_key = "scrape_lock"
            lock = await upstash_get(lock_key)
            if lock:
                await asyncio.sleep(300)
                continue
                
            await upstash_set(lock_key, {"ts": time.time()}, ex=3500)
            
            await do_scrape() # Pindahkan logika scraping ke fungsi terpisah
            
        except Exception as e:
            print(f"[Cron] Fatal error: {e}")
            # Exponential backoff, bukan langsung mati atau sleep 3600 detik
            await asyncio.sleep(60)
        else:
            await asyncio.sleep(3600)
```

### 4. N+1 AniList API Calls — Rate Limiting Risk
Proses pembaruan data menggunakan AniList berpotensi besar terkena pemblokiran (*Rate Limiting*) karena melakukan banyak *request* secara serentak.

**Konteks dalam Kode (`backend/main.py` bagian `background_scrape_job`):**
```python
# Ini bisa menghasilkan 30+ concurrent requests ke AniList dalam hitungan detik
enhanced_items = await asyncio.gather(*(enhance_item(item) for item in items[:30]))
enhanced_series = await asyncio.gather(*(enhance_item(s) for s in series_list))
```

**Masalah:**
API publik AniList memiliki batasan (*Rate Limit*) yang ketat: maksimal 90 *requests* per menit. Memanggil `asyncio.gather` pada 30 *items* + 40 *series* (total 70 *requests*) dalam satu waktu (*burst*) akan langsung menyentuh batas tersebut. Ini berisiko tinggi membuat IP server diblokir (Error 429).

**Solusi (Semaphore + Batching):**
Terapkan batas konkurensi (Concurrency Limit) menggunakan `asyncio.Semaphore` dan lakukan *batching* dengan penundaan (*delay*).
```python
# Batasi maksimal 5 request bersamaan
ANILIST_SEM = asyncio.Semaphore(5)  

async def enhance_item_safe(item):
    async with ANILIST_SEM:
        return await enhance_item(item)
        
# Batching yang menyadari batas rate limit
async def batch_enhance(items, batch_size=5, delay=1.0):
    results = []
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        batch_results = await asyncio.gather(*[enhance_item_safe(i) for i in batch])
        results.extend(batch_results)
        if i + batch_size < len(items):
            await asyncio.sleep(delay)
    return results
```

### 5. Watch History — localStorage Race Condition
Terdapat inkonsistensi yang parah antara penyimpanan lokal (browser) dan Cloud Database untuk fitur Riwayat Tontonan.

**Konteks dalam Kode:**
Komponen `frontend/components/HistoryTracker.tsx` dan `frontend/components/ContinueWatching.tsx` keduanya membaca dan menulis menggunakan `localStorage` secara independen:
```typescript
// ContinueWatching.tsx & HistoryTracker.tsx
const data = localStorage.getItem("anime_watch_history");
```

**Masalah:**
Meskipun Anda telah memiliki tabel `watchHistory` di Drizzle (Neon Postgres) dan skema sesi (Better Auth), fitur *Continue Watching* hanya mengandalkan *localStorage* (yang tidak sinkron antar perangkat). Terdapat tiga sumber kebenaran (*Source of Truth*) yang saling tidak sinkron:
1. `localStorage` (diperbarui seketika, namun hanya di perangkat tersebut).
2. *Cloud DB* via `/api/history` (hanya menerima data pembaruan).
3. `ContinueWatching` komponen (hanya membaca dari `localStorage`).

Ini berarti komponen `ContinueWatching.tsx` tidak pernah mengambil data resmi dari `/api/history` untuk pengguna yang sedang *login*. Hal ini akan menyebabkan inkonsistensi data yang sangat membingungkan pengguna (misal: riwayat di HP berbeda dengan riwayat di Laptop meskipun akunnya sama).

---

## 🟡 Medium Priority — Architectural Concerns

### 6. Schema Design — Missing Index & Cascade
Desain skema database Drizzle perlu dioptimalkan untuk performa kueri dan integritas referensial.

**Konteks dalam Kode (`frontend/db/schema.ts`):**
```typescript
export const watchHistory = pgTable("watch_history", {
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  animeSlug: text("animeSlug").notNull(),
  // ... kolom lainnya
  updatedAt: timestamp("updatedAt").notNull()
}
```

**Masalah & Solusi:**
1.  **Tidak ada Index:** Tidak ada indeks pada kolom yang sering di-*query* (seperti `userId`, `animeSlug`, dan `updatedAt`). Kueri akan melambat seiring bertambahnya data. Tambahkan indeks saat migrasi:
    ```sql
    CREATE INDEX idx_watch_history_user_id ON watch_history("userId");
    CREATE INDEX idx_watch_history_updated_at ON watch_history("updatedAt" DESC);
    CREATE INDEX idx_bookmarks_user_id ON bookmarks("userId");
    ```
2.  **Integritas Referensial (Tabel Account):** (Catatan: Kode saat ini *sudah* menggunakan `references` pada tabel user, namun perlu diverifikasi ulang pada migrasi bahwa relasi seperti `account_userId_user_id_fk` memiliki aturan `ON DELETE CASCADE` di tingkat database agar data terkait terhapus saat *user* dihapus).

### 7. AnimeCard.tsx — Memory Leak & Stale Cache
*(Catatan: Poin ini tidak ditemukan secara eksplisit di file yang direview, tetapi berlaku umum jika komponen tersebut menggunakan logika cache serupa).*

**Masalah:**
Jika menggunakan `sessionStorage` untuk *caching* tanpa strategi invalidasi (invalidation strategy), pengguna tidak akan pernah melihat pembaruan data (misalnya jika *cover image* diubah di AniList). Selain itu, penggunaan *random timeout* untuk mengambil data tidak efektif mencegah *rate limiting*.

### 8. Security — SSRF Vulnerability & CORS Permisif
Pengaturan keamanan di sisi *backend* masih terlalu longgar.

**Konteks dalam Kode (`backend/main.py`):**
```python
# Terlalu permisif untuk produksi
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # SEHARUSNYA: Lock down ke domain spesifik
)

# Kerentanan SSRF (Server-Side Request Forgery)
@app.get('/api/scrape')
async def scrape_episode(url: str = Query(...)):
    r = await client.get(url)  # Hacker bisa menyisipkan URL sembarang
```

**Masalah:**
1.  **CORS:** Mengizinkan semua origin (`*`) berbahaya jika API ini tidak dimaksudkan untuk publik.
2.  **SSRF (Server-Side Request Forgery):** Parameter `url` di `/api/scrape` diterima mentah-mentah tanpa validasi. *Attacker* bisa memanfaatkan celah ini untuk memaksa server *backend* Anda mengakses *endpoint* internal (seperti layanan internal cloud atau metadata AWS) atau mengunduh dari situs berbahaya.

**Minimal Fix untuk SSRF:**
Validasi parameter URL menggunakan *whitelist* domain.
```python
from urllib.parse import urlparse
from fastapi import HTTPException

ALLOWED_DOMAINS = {"o.oploverz.ltd", "oploverz.ltd", "graphql.anilist.co"}

def validate_scrape_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.hostname in ALLOWED_DOMAINS

@app.get('/api/scrape')
async def scrape_episode(url: str = Query(...)):
    if not validate_scrape_url(url):
        raise HTTPException(status_code=400, detail="Domain not allowed for scraping")
    # ... proses scraping
```

---

## 🟢 Architecture Recommendations (Rencana Aksi Prioritas)

### Proposed Clean Architecture
Untuk skala produksi, arsitektur yang disarankan adalah:

*   **Cloudflare Pages:** Menangani Edge Routes (UI/Tampilan) dan Node.js Routes (Auth & Database menggunakan Better-Auth dan Drizzle).
*   **Neon PostgreSQL:** Terhubung secara efisien via Edge (menggunakan driver serverless).
*   **HF Spaces / VM Terpisah:** Menangani FastAPI Backend yang berat untuk *Scraping* & manipulasi AniList, dilindungi oleh Upstash Redis.
*   **Upstash QStash:** Sebagai pemicu (cron) eksternal untuk *scraping background job* agar tidak bergantung pada kondisi idle HF Spaces.

### Prioritized Action Plan

| Priority | Item | Estimasi Effort |
| :--- | :--- | :--- |
| **P0** | **Rotate & remove hardcoded Upstash token di `main.py`** | 30 menit |
| **P0** | **Fix runtime boundary (ubah `export const runtime = 'edge'` menjadi `'nodejs'` pada folder API Auth dan History)** | 2 jam |
| P1 | SSRF validation di `/api/scrape` | 1 jam |
| P1 | Fix `ContinueWatching` cloud sync (gunakan `/api/history` sebagai *source of truth* untuk user login) | 3 jam |
| P1 | Cron reliability (Gunakan QStash atau perbaiki logika *retry/backoff*) | 4 jam |
| P2 | AniList rate limiting dengan *Semaphore* dan *Batching* | 2 jam |
| P2 | Penambahan Database indexes | 1 jam |
| P3 | CORS lockdown di FastAPI | 30 menit |

---

## 🏁 Finishing Phase (Pertanyaan Tambahan untuk Claude)

### 1. Penanganan "Sudden Exit" pada Player (Akurasi History)
**Pertanyaan:** "Di Q2, Anda menyarankan interval sinkronisasi 15 detik. Namun, jika user menonton selama 14 detik lalu langsung menutup browser/tab (Sudden Exit), data tontonan terakhir tersebut akan hilang. Bagaimana cara mengintegrasikan **Page Visibility API** atau event **beforeunload** dengan hook `useWatchHistory` agar data terakhir tetap terkirim ke database sesaat sebelum tab ditutup?"

### 2. Penanganan Shortlinks & Redirects pada SSRF Guard
**Pertanyaan:** "Terkait SSRF Guard di Q3, situs anime sering menggunakan link pendek (shortlinks) seperti bit.ly atau cutt.ly yang melakukan redirect ke server video asli. Jika saya menggunakan `follow_redirects=False` pada `scraping_client` untuk keamanan, bagaimana cara scraper saya tetap bisa mendapatkan URL akhir dari server video tersebut tanpa membuka celah SSRF di setiap lompatan redirect-nya?"
