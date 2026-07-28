# Deploy ke Vercel

Frontend React dan API Express berjalan dalam satu project Vercel. Database dan
Auth tetap memakai project Supabase yang sama dengan lokal.

## Arsitektur produksi

```text
/api/* ──rewrite──> api/index.js ──> Express app
/*      ──────────> artifacts/sed-command-center/dist/public
```

`build.mjs` membundel handler Express menjadi `api/index.js`.
`vercel.json` meneruskan seluruh sisa path melalui parameter `__p`, lalu
`vercel-handler.ts` mengembalikan URL asli sebelum router Express berjalan.
Rewrite eksplisit ini wajib: konvensi file catch-all sebelumnya hanya menangkap
satu segmen sehingga `/api/customers` bekerja, tetapi endpoint bertingkat seperti
`/api/dashboard/summary` mendapat 404 dari Vercel.

## 1. Environment variables

Tambahkan di **Vercel → Project → Settings → Environment Variables** untuk
**Production** dan **Preview**:

| Nama                            | Nilai                                              |
| ------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                  | URI Supabase **Transaction pooler**, port **6543** |
| `SUPABASE_URL`                  | `https://<project-ref>.supabase.co`                |
| `VITE_SUPABASE_URL`             | URL project yang sama                              |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable key aktif (`sb_publishable_...`)       |
| `BUSINESS_TIME_ZONE`            | opsional, default `Asia/Makassar`                  |

`DATABASE_URL` adalah rahasia. Ambil URI lengkap dari **Supabase → Connect →
Transaction pooler** dan jangan menghapus parameter TLS yang diberikan Supabase.
Gunakan Session pooler port 5432 hanya untuk proses lokal yang hidup lama.

Vite memasukkan variabel `VITE_*` saat build. Mengubah environment variable tidak
mengubah deployment lama, jadi selalu lakukan **Redeploy** sesudahnya. Build
produksi sekarang sengaja gagal lebih awal bila salah satu variabel wajib hilang.

## 2. Auth internal

API hanya menerima JWT user Supabase dengan `app_metadata.crm_access=true`.
User aktif yang sudah ada telah diberi metadata tersebut. Untuk menambah staff
baru, buat user lewat **Authentication → Users**, lalu jalankan di SQL Editor
dengan email staff yang benar:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"crm_access": true}'::jsonb
where email = 'staff@example.com';
```

Matikan pendaftaran publik di **Authentication → Sign In / Providers → Email →
Allow new users to sign up**. Gate API tetap melindungi CRM bila pengaturan ini
terlewat, tetapi signup publik yang tidak dipakai sebaiknya tetap ditutup.

## 3. Deploy

1. Commit dan push perubahan ke branch yang terhubung ke Vercel.
2. Pastikan environment variables di atas tersedia pada environment tujuan.
3. Deploy atau redeploy.

Project mengunci Node 24 dan pnpm 10.30.3. Function ditempatkan di region
`sin1`, dekat Supabase `ap-southeast-1`.

## 4. Verifikasi sesudah deploy

```text
GET /api/healthz                 → 200 JSON
GET /api/dashboard/summary      → 401 JSON tanpa login, 200 setelah login
GET /api/customers/stats/summary→ 401 JSON tanpa login, 200 setelah login
POST /api/customers             → 201 setelah login dan payload valid
POST /api/business-units        → 201 setelah login dan payload valid
```

Respons JSON `Not found` berarti request sudah mencapai Express. Respons
plaintext/HTML 404 dengan header `x-vercel-error: NOT_FOUND` berarti rewrite
deployment belum memakai versi terbaru.

## Lokal versus Vercel

|              | Lokal                       | Vercel              |
| ------------ | --------------------------- | ------------------- |
| Database     | Supabase yang sama          | Supabase yang sama  |
| Pooler       | Session, 5432               | Transaction, 6543   |
| API          | proses Express di port 5001 | serverless function |
| Frontend     | Vite dev server             | file statis/CDN     |
| Zona laporan | `Asia/Makassar`             | `Asia/Makassar`     |

Data lokal dan produksi akan sama bila keduanya menggunakan project Supabase
yang sama. Jangan memakai `DATABASE_URL` project lain untuk Preview kecuali
memang ingin memisahkan datanya.
