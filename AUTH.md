# Autentikasi dan akses CRM

Login memakai email/password Supabase Auth. Memiliki akun Supabase saja belum
cukup: API juga mewajibkan `app_metadata.crm_access=true`.

```text
Browser ── login ──> Supabase Auth
Browser <── JWT ──── Supabase Auth
Browser ── Bearer JWT ──> Express
Express ── verifikasi JWKS + cek auth.users ──> query CRM
```

Middleware `requireAuth.ts` memeriksa:

1. signature, issuer, expiry, dan audience JWT;
2. `role=authenticated` serta bukan anonymous user;
3. user masih aktif/tidak diblokir;
4. `raw_app_meta_data.crm_access=true`.

Signature diverifikasi lokal terhadap JWKS Supabase. Pengecekan izin dibaca dari
`auth.users` dan di-cache singkat, sehingga pencabutan akses tidak menunggu JWT
lama kedaluwarsa. `/api/healthz` tetap publik dan tidak membuka data bisnis.

## Menambah user staff

1. Buat user di **Supabase → Authentication → Users → Add user**.
2. Aktifkan akses melalui SQL Editor:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"crm_access": true}'::jsonb
where email = 'staff@example.com';
```

Untuk mencabut akses tanpa menghapus akun:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) - 'crm_access'
where email = 'staff@example.com';
```

Gunakan `app_metadata`, bukan `user_metadata`: user dapat mengubah
`user_metadata` miliknya sendiri.

## Pengaturan Supabase yang wajib

Di **Authentication → Sign In / Providers → Email**, matikan **Allow new users
to sign up** karena CRM tidak menyediakan pendaftaran publik. API tetap menolak
akun tanpa `crm_access`, tetapi menutup signup mengurangi akun sampah dan risiko
penyalahgunaan.

Aktifkan juga perlindungan password bocor pada pengaturan password Auth.

## Environment variables

| Nama                            | Dipakai                                | Rahasia? |
| ------------------------------- | -------------------------------------- | -------- |
| `SUPABASE_URL`                  | API/JWKS                               | tidak    |
| `VITE_SUPABASE_URL`             | frontend/login dan fallback API        | tidak    |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend/login                         | tidak    |
| `DATABASE_URL`                  | API dan pengecekan izin                | **ya**   |
| `CORS_ORIGIN`                   | origin tambahan bila frontend terpisah | tidak    |

Publishable key memang dikirim ke browser. Tabel CRM memiliki RLS aktif tanpa
policy permisif, sehingga key tersebut tidak dapat membaca tabel secara langsung.
Semua akses data berjalan melalui API bertoken.

## Respons yang perlu dikenali

| Status                          | Arti                                          |
| ------------------------------- | --------------------------------------------- |
| 401                             | token hilang, salah, atau kedaluwarsa         |
| 403                             | user valid tetapi tidak memiliki `crm_access` |
| 503 `AUTHORIZATION_UNAVAILABLE` | API tidak dapat mengecek user/database        |

Jika issuer salah, pastikan `SUPABASE_URL` dan `VITE_SUPABASE_URL` menunjuk
project yang sama. Setelah mengubah environment variable Vercel, redeploy.

## Catatan fitur login

Reset password dari link “Forgot password?” belum memiliki halaman callback di
aplikasi; sementara lakukan reset melalui dashboard Supabase. Sesi login sudah
persisten dan otomatis direfresh oleh `supabase-js`.
