# Phase 5 Execution Plan: Supabase, Drizzle ORM, & Better-Auth

## Konteks Terakhir
Kita baru saja mengonfirmasi bahwa koneksi ke Supabase via MCP telah berhasil dan terautentikasi. Kredensial Google OAuth juga sudah diamankan di memori dan `.env`. Sekarang kita akan merakit infrastruktur Database dan Autentikasi.

## Todo List Eksekusi:

1. **Inisialisasi Database (Supabase + Drizzle):**
   - Instal dependensi yang dibutuhkan: `drizzle-orm`, `drizzle-kit`, `postgres`, `@neondatabase/serverless` (untuk kompatibilitas Edge Cloudflare).
   - Buat skema database di `frontend/db/schema.ts` (Tabel pengguna, sesi, riwayat tontonan, bookmark).
   - Buat konfigurasi koneksi di `frontend/db/index.ts`.
   - Terapkan (Push) skema Drizzle ke Supabase menggunakan `drizzle-kit push`.

2. **Pengaturan Autentikasi (Better-Auth):**
   - Instal `better-auth`.
   - Konfigurasi `frontend/lib/auth.ts` menggunakan Google Provider dan Drizzle Adapter.
   - Buat endpoint API Catch-all untuk Better-Auth di `frontend/app/api/auth/[...all]/route.ts`.
   - Perbarui UI (misal: `Navbar.tsx`) untuk menambahkan tombol "Login dengan Google".

3. **Sinkronisasi Riwayat Tontonan (API & Player):**
   - Buat Edge API Routes di `frontend/app/api/history/route.ts` untuk menyimpan (UPSERT) dan mengambil riwayat tontonan.
   - Perbarui komponen `Player.tsx` agar mengirimkan *progress* tontonan (detik/menit) setiap 30 detik ke database via API.
   - Perbarui halaman `watch/[id]/[episode]/page.tsx` agar otomatis mengambil posisi waktu terakhir dari database jika ada.

## Target Hasil
Aplikasi akan memiliki fitur Login menggunakan akun Google. Setelah login, setiap anime yang ditonton akan tersimpan riwayat menit/detiknya di Supabase, dan bisa dilanjutkan kembali kapan saja.