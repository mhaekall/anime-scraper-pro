# 🚀 Plan: Data Visualization Enhancement (Big Tech Style)

Dokumen ini merinci rencana pemanfaatan data yang sudah tersedia di database (`anime_metadata`, `watch_history`, `bookmarks`) untuk meningkatkan kualitas UI/UX di frontend.

---

## 1. Halaman: Home (Beranda)
**Tujuan:** Memberikan kemudahan akses dan informasi cepat (urgency).

| Fitur | Sumber Data | Komponen | Panduan |
| :--- | :--- | :--- | :--- |
| **Visual Progress Bar** | `watch_history` (`timestampSec`, `durationSec`) | `AnimeCard.tsx` | Tambahkan garis tipis di bawah poster. Rumus: `(timestamp / duration) * 100`. Jika > 90%, beri label "Selesai". |
| **Airing Countdown** | `anime_metadata` (`nextAiringEpisode`) | `HeroCarousel.tsx` | Tampilkan "Next Episode: Today 20:00" atau "In 2 hours" untuk anime yang sedang tayang. |
| **Quick Resume** | `watch_history` (latest) | `ContinueWatching.tsx` | Tampilkan tombol "Lanjutkan Eps X" langsung di card home untuk anime terakhir yang ditonton. |

---

## 2. Halaman: Anime Detail
**Tujuan:** Memberikan informasi mendalam dan meningkatkan keterikatan user (engagement).

| Fitur | Sumber Data | Lokasi UI | Panduan |
| :--- | :--- | :--- | :--- |
| **Native Title** | `anime_metadata` (`nativeTitle`) | Di bawah Judul Utama | Tampilkan judul Jepang (Kanji/Kana) dengan font yang lebih tipis/kecil untuk estetika minimalis. |
| **More Like This** | `anime_metadata` (`recommendations`) | Bagian Bawah Halaman | Buat horizontal scroll atau grid kecil berisi anime yang direkomendasikan oleh AniList. |
| **Production Info** | `anime_metadata` (`studios`) | Tab "Overview" | Tampilkan semua studio yang terlibat (JSONB), bukan hanya yang pertama. |
| **Detailed Status** | `anime_metadata` (`status`, `season`, `year`) | Sidebar Info | Tampilkan kombinasi "Spring 2024 • TV • Finished" untuk konteks rilis yang lebih lengkap. |

---

## 3. Halaman: Library (Koleksi)
**Tujuan:** Manajemen konten user yang rapi.

| Fitur | Sumber Data | Komponen | Panduan |
| :--- | :--- | :--- | :--- |
| **Status Filter** | `bookmarks` (`status`) | `CollectionView.tsx` | Tambahkan tab filter: "Watching", "Plan to Watch", "Completed", "Dropped". |
| **Last Watched Sort** | `watch_history` (`updatedAt`) | `LibraryGrid.tsx` | Urutkan koleksi berdasarkan aktivitas menonton terakhir, bukan berdasarkan waktu simpan. |

---

## 4. Langkah Implementasi (Phases)

### Fase 1: Visual Identity (Quick Wins)
- [x] Implementasi `nativeTitle` di `AnimeDetailClient.tsx`.
- [x] Implementasi Progress Bar di `AnimeCard.tsx`.
- [x] Perbaikan tampilan Studio Produksi (menampilkan semua studio dari JSONB).

### Fase 2: Content Discovery
- [x] Integrasi `recommendations` JSON ke dalam komponen `RecommendationsGrid.tsx`.
- [x] Menambahkan seksi "More Like This" di halaman Detail.

### Fase 3: User Experience (Advanced)
- [x] Implementasi logic countdown `nextAiringEpisode` (menggunakan library `date-fns` atau Intl).
- [x] Penambahan filter status di halaman Library/Collection.

---

## 5. Catatan Teknis
- Gunakan **Client-Side Lazy Hydration** untuk seksi Rekomendasi agar tidak memperlambat LCP (Largest Contentful Paint).
- Manfaatkan **Tailwind CSS Glassmorphism** untuk overlay Countdown/Progress Bar agar mengikuti gaya desain Apple (HIG).
- Pastikan fallback data (jika null) ditangani dengan elegan (skeleton loading atau menyembunyikan elemen).
