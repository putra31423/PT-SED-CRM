# Autentikasi

Login email + password lewat Supabase Auth. Setiap user yang berhasil login punya akses penuh
(belum ada pembedaan role — lihat "Menambah role" di bawah).

## Cara kerjanya

```
Browser                    Express API              Supabase
   │                            │                       │
   ├─ login email+password ─────┼──────────────────────▶│
   │◀──────── JWT ──────────────┼───────────────────────┤
   │                            │                       │
   ├─ GET /api/customers ──────▶│                       │
   │   Authorization: Bearer    ├─ verifikasi JWT ──────│ JWKS (di-cache)
   │                            ├─ query Postgres ─────▶│
   │◀─────── data ──────────────┤                       │
```

Token diverifikasi **lokal** di Express memakai kunci publik dari JWKS endpoint Supabase
(ES256, kunci asimetris) — bukan dengan memanggil Auth API tiap request. Tanpa network
round-trip per request, yang penting saat berjalan di serverless.

| Berkas | Peran |
|---|---|
| `artifacts/api-server/src/middlewares/requireAuth.ts` | Verifikasi JWT, tolak 401 |
| `artifacts/api-server/src/app.ts` | Pasang middleware ke 36 route + kunci CORS |
| `artifacts/sed-command-center/src/lib/supabase.ts` | Client Supabase (khusus auth) |
| `artifacts/sed-command-center/src/pages/login.tsx` | Form login |
| `artifacts/sed-command-center/src/components/auth-guard.tsx` | Cegah render sebelum sesi diketahui |
| `artifacts/sed-command-center/src/App.tsx` | Daftarkan token getter |

`/api/healthz` sengaja tetap publik supaya uptime monitor bisa bekerja tanpa kredensial.
Endpoint itu tidak membuka data apa pun.

## Yang HARUS Anda lakukan di dashboard Supabase

Dua langkah ini tidak bisa dikerjakan dari kode.

### 1. Matikan pendaftaran publik — WAJIB

Secara default Supabase mengizinkan **siapa pun mendaftar sendiri**. Untuk CRM berisi data
pelanggan, itu berarti siapa pun yang tahu URL-nya bisa membuat akun dan langsung masuk.

**Authentication → Sign In / Providers → Email → matikan "Allow new users to sign up"**

Jangan lewati langkah ini sebelum aplikasi online.

### 2. Buat user pertama

**Authentication → Users → Add user → Create new user**

Isi email dan password, centang **Auto Confirm User** (kalau tidak, user harus verifikasi email
dulu sementara SMTP bawaan Supabase sangat dibatasi kuotanya).

Ulangi untuk setiap staff yang perlu akses.

## Variabel environment

| Nama | Dipakai | Rahasia? |
|---|---|---|
| `SUPABASE_URL` | API — mengambil JWKS | tidak |
| `VITE_SUPABASE_URL` | Frontend — login | tidak |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend — login | tidak, memang publik |
| `CORS_ORIGIN` | API — daftar origin yang boleh | tidak |
| `DATABASE_URL` | API — koneksi database | **YA** |

Publishable key aman ikut ter-bundle di frontend: semua tabel punya RLS aktif tanpa policy
permisif, jadi key itu tidak memberi akses data sama sekali. Sudah dibuktikan — sebagai role
`anon`, nol baris terlihat.

`CORS_ORIGIN` dikosongkan berarti same-origin saja. Itu benar untuk dev (proxy Vite) maupun
Vercel (frontend dan `/api` satu origin). Isi hanya kalau frontend dan API beda domain.

## Yang sudah diverifikasi

| Uji | Hasil |
|---|---|
| Request tanpa token | 401 di semua endpoint data |
| Request dengan token palsu | 401 |
| `/api/healthz` tanpa token | 200 (publik, disengaja) |
| Trik lama `localStorage.sed_user` | Ditolak, dilempar ke `/login` |
| Login dengan kredensial salah | "Email atau password salah" |
| JWKS project | 1 kunci ES256 tersedia |

Yang belum bisa diuji: login **berhasil** — perlu user sungguhan, dan pembuatan akun harus
Anda lakukan sendiri. Kalau setelah membuat user login masih gagal, cek log API: pesan
`unexpected "iss" claim value` berarti `SUPABASE_URL` salah.

## Masih tersisa

**Reset password belum berfungsi.** Link "Forgot password?" di halaman login masih `href="#"`.
Supabase menyediakan alurnya gratis, tapi perlu halaman tujuan untuk memasukkan password baru.
Untuk sementara, reset password user lewat dashboard Supabase.

**Checkbox "Remember me for 30 days" tidak melakukan apa-apa.** Sesi sudah otomatis bertahan
lintas restart browser (`persistSession: true`), jadi perilakunya seperti selalu tercentang.

**Tombol Google dan Microsoft dihapus** dari halaman login — keduanya tidak pernah terhubung ke
apa pun, dan client menyatakan tidak memerlukan login OAuth.

## Menambah role nanti

Struktur sekarang sengaja rata: semua user yang login setara. Menambah Admin vs Staff nanti
tidak membongkar apa pun yang sudah ada:

1. Simpan role di `app_metadata` user Supabase (bukan `user_metadata` — yang itu bisa diubah
   sendiri oleh user)
2. Baca `payload.app_metadata.role` di `requireAuth.ts` dan taruh di `req.user`
3. Tambah middleware `requireRole("admin")` untuk route yang perlu dibatasi
4. Untuk filter per-baris, tambahkan kolom pemilik ke tabel — saat ini `assigned_staff` masih
   berupa teks bebas, bukan foreign key ke user
